'use strict';

// Job pianificato: marca come "abbandonati" i carrelli attivi rimasti inattivi
// oltre una soglia di giorni e rimuove quelli guest ormai vuoti.

const cron = require('node-cron');
const { Op } = require('sequelize');
const db = require('../models');
const logger = require('../utils/logger');

const SCHEDULE = process.env.CART_CLEANUP_CRON || '0 3 * * *'; // ogni giorno 03:00
const ABANDON_DAYS = Number(process.env.CART_ABANDON_DAYS || 7);

async function runOnce() {
  const threshold = new Date(Date.now() - ABANDON_DAYS * 24 * 60 * 60 * 1000);

  const [abandoned] = await db.Cart.update(
    { status: 'abandoned' },
    { where: { status: 'active', updated_at: { [Op.lt]: threshold } } },
  );

  // Rimuove i carrelli guest abbandonati e privi di articoli.
  const staleGuests = await db.Cart.findAll({
    where: { status: 'abandoned', user_id: null },
    include: [{ association: 'items' }],
  });
  let removed = 0;
  for (const cart of staleGuests) {
    if (!cart.items || cart.items.length === 0) {
      await cart.destroy();
      removed += 1;
    }
  }

  logger.info(`Job carrelli: ${abandoned} marcati abbandonati, ${removed} guest vuoti rimossi`);
  return { abandoned, removed };
}

function start() {
  cron.schedule(SCHEDULE, () => {
    runOnce().catch((err) => logger.error(`Job carrelli fallito: ${err.message}`));
  });
  logger.info(`Job pulizia carrelli pianificato (${SCHEDULE}, soglia ${ABANDON_DAYS}g)`);
}

module.exports = { start, runOnce };
