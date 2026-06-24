'use strict';

process.env.TZ = 'Europe/Rome';
require('dotenv').config();

const http = require('http');
const app = require('./app');
const { sequelize } = require('./src/models');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

let server;
let shuttingDown = false;

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Connessione al database riuscita');

    // Garantisce il bucket immagini su MinIO (non blocca l'avvio se MinIO
    // non è raggiungibile in locale: viene loggato un warning).
    try {
      const { ensureBucket } = require('./src/config/minio');
      await ensureBucket();
    } catch (err) {
      logger.warn(`MinIO non disponibile all'avvio: ${err.message}`);
    }

    server = http.createServer(app);
    server.listen(PORT, () => {
      logger.info(`Server avviato su http://localhost:${PORT}`);
      logger.info(`Documentazione su http://localhost:${PORT}/api-docs`);
    });

    // Job pianificati (cron). Saltati in ambiente di test.
    if (process.env.NODE_ENV !== 'test') {
      require('./src/jobs').startJobs();
    }
  } catch (error) {
    logger.error('Errore connessione database', error);
    process.exit(1);
  }
};

// Lifecycle di shutdown: gestione segnali/timeout difficile da unit-testare.
// fallow-ignore-next-line complexity
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.warn(`${signal} ricevuto — avvio shutdown`);

  const forceExit = setTimeout(() => {
    logger.error('Shutdown timeout superato — exit forzato');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    if (server && server.listening) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err && err.code !== 'ERR_SERVER_NOT_RUNNING') return reject(err);
          resolve();
        });
      });
    }
    await sequelize.close();
    logger.info('Shutdown completato');
    process.exit(0);
  } catch (err) {
    logger.error('Errore durante lo shutdown', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) =>
  logger.error('Unhandled rejection', reason instanceof Error ? reason : new Error(String(reason))),
);
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
  shutdown('uncaughtException');
});

start();
