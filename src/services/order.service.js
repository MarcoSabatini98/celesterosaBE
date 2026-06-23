'use strict';

// Lettura ordini per il cliente e per l'admin, con serializzazione coerente.

const db = require('../models');
const AppError = require('../errors/AppError');
const { round2 } = require('../utils/pricing');
const { publicUrl } = require('../config/minio');

function serializeOrder(order) {
  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    email: order.email,
    currency: order.currency,
    subtotal: round2(order.subtotal),
    vat_total: round2(order.vat_total),
    shipping_total: round2(order.shipping_total),
    grand_total: round2(order.grand_total),
    placed_at: order.placed_at,
    paid_at: order.paid_at,
    shipped_at: order.shipped_at,
    delivered_at: order.delivered_at,
    shipping: {
      recipient: order.shipping_recipient,
      line1: order.shipping_line1,
      line2: order.shipping_line2,
      city: order.shipping_city,
      province: order.shipping_province,
      postal_code: order.shipping_postal_code,
      country: order.shipping_country,
      phone: order.shipping_phone,
    },
    billing_vat: order.billing_vat,
    notes: order.notes,
    items: (order.items || []).map((it) => ({
      id: it.id,
      product_name: it.product_name,
      variant_name: it.variant_name,
      sku: it.sku,
      unit_price: round2(it.unit_price),
      quantity: it.quantity,
      vat_rate: round2(it.vat_rate),
      line_total: round2(it.line_total),
    })),
    payment: order.payment
      ? { status: order.payment.status, provider: order.payment.provider, paid_at: order.payment.paid_at }
      : null,
    invoice: order.invoice
      ? {
          number: order.invoice.invoice_number,
          status: order.invoice.status,
          pdf_url: order.invoice.pdf_key ? publicUrl(order.invoice.pdf_key) : null,
        }
      : null,
  };
}

const FULL_INCLUDE = [
  { association: 'items' },
  { association: 'payment' },
  { association: 'invoice' },
];

async function listForUser(userId, { page = 1, limit = 10 } = {}) {
  const { count, rows } = await db.Order.findAndCountAll({
    where: { user_id: userId },
    include: FULL_INCLUDE,
    order: [['created_at', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });
  return {
    items: rows.map(serializeOrder),
    page,
    limit,
    total: count,
    total_pages: Math.ceil(count / limit) || 1,
  };
}

async function getForUser(userId, orderNumber) {
  const order = await db.Order.findOne({
    where: { user_id: userId, order_number: orderNumber },
    include: FULL_INCLUDE,
  });
  if (!order) throw AppError.notFound('Ordine non trovato');
  return serializeOrder(order);
}

async function getByNumber(orderNumber) {
  const order = await db.Order.findOne({
    where: { order_number: orderNumber },
    include: FULL_INCLUDE,
  });
  if (!order) throw AppError.notFound('Ordine non trovato');
  return serializeOrder(order);
}

async function listAll({ page = 1, limit = 20, status = null } = {}) {
  const where = {};
  if (status) where.status = status;
  const { count, rows } = await db.Order.findAndCountAll({
    where,
    include: FULL_INCLUDE,
    order: [['created_at', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });
  return {
    items: rows.map(serializeOrder),
    page,
    limit,
    total: count,
    total_pages: Math.ceil(count / limit) || 1,
  };
}

module.exports = { serializeOrder, listForUser, getForUser, getByNumber, listAll };
