'use strict';

// Generazione numeri progressivi per ordini e fatture.
// Formato ordine:  ORD-AAAAMMGG-XXXX (random) — univoco con vincolo DB.
// Formato fattura: <PREFIX>/AAAA/NNNN (progressivo annuale) — calcolato dal
// chiamante passando il contatore.

const crypto = require('crypto');

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function orderNumber() {
  const rand = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  return `ORD-${todayStamp()}-${rand}`;
}

function invoiceNumber(prefix, year, progressive) {
  return `${prefix}/${year}/${String(progressive).padStart(4, '0')}`;
}

module.exports = { orderNumber, invoiceNumber };
