'use strict';

// Area ordini del cliente autenticato: lista, dettaglio e fattura. Tutte le
// operazioni sono vincolate all'utente proprietario.

const AppError = require('../errors/AppError');
const orderRepository = require('../repositories/order.repository');
const invoiceService = require('./invoice.service');
const { parsePagination, toPaginated } = require('../utils/pagination');
const { toOrder, toInvoiceResult } = require('../serializers/order.serializer');

// Stati in cui la fattura è disponibile (ordine pagato).
const INVOICEABLE = new Set(['paid', 'processing', 'shipped', 'delivered']);

async function myOrders(user, query = {}) {
  const pagination = parsePagination(query);
  const { rows, count } = await orderRepository.findAndCountByUser(user.id, pagination);
  return toPaginated(rows.map(toOrder), count, pagination);
}

async function myOrder(user, orderNumber) {
  const order = await orderRepository.findByNumberForUser(orderNumber, user.id);
  if (!order) throw AppError.notFound('Ordine non trovato');
  return toOrder(order);
}

async function getInvoice(user, orderNumber) {
  const order = await orderRepository.findByNumberForUser(orderNumber, user.id);
  if (!order) throw AppError.notFound('Ordine non trovato');
  if (!INVOICEABLE.has(order.status)) {
    throw AppError.unprocessable('Fattura non disponibile: ordine non ancora pagato');
  }
  const invoice = await invoiceService.ensureInvoice(order);
  return toInvoiceResult(invoice);
}

module.exports = { myOrders, myOrder, getInvoice };
