'use strict';

// Effetti post-pagamento: generazione fattura PDF su MinIO e invio email di
// conferma con la fattura allegata. Invocato da stripe.service dopo che
// l'ordine è stato marcato come pagato. Gli errori non bloccano il pagamento.

const db = require('../models');
const logger = require('../utils/logger');
const invoiceService = require('./invoice.service');
const emailService = require('./email.service');

async function onOrderPaid(orderId) {
  const order = await db.Order.findByPk(orderId, { include: [{ association: 'items' }] });
  if (!order) return;

  let invoice = null;
  let pdfBuffer = null;
  try {
    const result = await invoiceService.generateForOrder(orderId);
    invoice = result.invoice;
    pdfBuffer = result.pdfBuffer;
  } catch (err) {
    logger.error(`Generazione fattura fallita per ordine ${orderId}: ${err.message}`);
  }

  // Email best-effort: non blocca né fa fallire il pagamento.
  emailService.sendOrderConfirmation(order, invoice, pdfBuffer).catch(() => {});
}

module.exports = onOrderPaid;
