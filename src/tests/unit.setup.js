// src/tests/unit.setup.js
// setupFilesAfterEnv del SOLO progetto "unit". Chiude l'eventuale connessione
// Sequelize al termine di ogni file: alcuni unit test, via dipendenze non
// mockate, potrebbero aprire un socket mysql2 nel pool e impedire al worker
// Jest di terminare pulito. close() è un no-op se nessuna connessione è aperta.
afterAll(async () => {
  try {
    const sequelize = require('../config/db');
    if (sequelize && typeof sequelize.close === 'function') {
      await sequelize.close();
    }
  } catch {
    // nessuna connessione da chiudere — no-op
  }
});
