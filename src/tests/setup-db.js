'use strict';

// Prepara il database di test: lo crea (se manca), applica le migrations e i
// seed. Eseguito dagli script npm prima degli integration test.

require('dotenv').config({ path: '.env.test', override: true });
process.env.NODE_ENV = 'test';

const { execSync } = require('child_process');

function run(cmd, { allowFail = false } = {}) {
  try {
    execSync(cmd, { stdio: 'inherit', env: process.env });
  } catch (err) {
    if (!allowFail) throw err;
  }
}

// Ricrea il database da zero a ogni run → stato deterministico (stock, conteggi)
// indipendente dalle esecuzioni precedenti.
run('npx sequelize-cli db:drop', { allowFail: true });
run('npx sequelize-cli db:create');
run('npx sequelize-cli db:migrate');
run('npx sequelize-cli db:seed:all');
