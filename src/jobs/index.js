'use strict';

// Avvio dei job pianificati. Disattivabile via JOBS_ENABLED=false (es. nei
// test o in ambienti dove un altro nodo già li esegue).

const logger = require('../utils/logger');
const abandonedCart = require('./abandoned-cart.job');

function startJobs() {
  if (String(process.env.JOBS_ENABLED ?? 'true').toLowerCase() === 'false') {
    logger.info('Job pianificati disattivati (JOBS_ENABLED=false)');
    return;
  }
  abandonedCart.start();
}

module.exports = { startJobs };
