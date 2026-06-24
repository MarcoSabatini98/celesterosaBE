'use strict';

// Genera un numero d'ordine leggibile e ragionevolmente univoco:
//   CEL-YYYYMMDD-XXXXXX   (prefisso configurabile via ORDER_NUMBER_PREFIX)
// La parte casuale esadecimale rende improbabili le collisioni; il vincolo
// UNIQUE sulla colonna order_number resta la garanzia finale.
const crypto = require('crypto');

const PREFIX = process.env.ORDER_NUMBER_PREFIX || 'CEL';

function generateOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${PREFIX}-${ymd}-${rand}`;
}

module.exports = { generateOrderNumber };
