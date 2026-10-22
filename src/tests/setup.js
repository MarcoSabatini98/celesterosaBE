// src/tests/setup.js
// setupFilesAfterEnv del progetto "integration". Ricrea il DB di test da zero,
// applica migration e seed prima dell'intera suite, e chiude il pool alla fine.
const { Sequelize } = require('sequelize');
const { execSync } = require('child_process');
const { sequelize } = require('../models');

// Guardia: opera solo in ambiente di test e su un DB il cui nome contiene
// 'test'. Evita di azzerare per errore il database di sviluppo/produzione.
function assertTestEnv() {
  const name = process.env.DB_NAME || '';
  if (process.env.NODE_ENV !== 'test' || !/test/i.test(name)) {
    throw new Error(`Setup test abortito: ambiente non di test (NODE_ENV=${process.env.NODE_ENV}, db=${name})`);
  }
}

beforeAll(async () => {
  assertTestEnv();

  // Connessione senza database selezionato per DROP/CREATE da zero.
  const tempSequelize = new Sequelize('', process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
  });
  await tempSequelize.query(`DROP DATABASE IF EXISTS \`${process.env.DB_NAME}\`;`);
  await tempSequelize.query(
    `CREATE DATABASE \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
  );
  await tempSequelize.close();

  // Migra e popola da zero. NODE_ENV passato via opzione `env` (non cross-env):
  // su Windows i worker Jest non risolvono sempre ./node_modules/.bin/cross-env
  // nel PATH del child process.
  const childEnv = { ...process.env, NODE_ENV: 'test' };
  execSync('npx sequelize-cli db:migrate', { stdio: 'inherit', env: childEnv });
  execSync('npx sequelize-cli db:seed:all', { stdio: 'inherit', env: childEnv });
}, 120000);

afterAll(async () => {
  // Chiude il pool: senza, il socket mysql2 idle tiene vivo il worker Jest.
  await sequelize.close();
});

beforeEach(() => {
  jest.clearAllMocks();
});
