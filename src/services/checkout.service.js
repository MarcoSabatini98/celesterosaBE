'use strict';

// Trasforma il carrello in un ordine e avvia il pagamento.

const db = require('../models');
const AppError = require('../errors/AppError');
const cartService = require('./cart.service');
const stripeService = require('./stripe.service');
const orderService = require('./order.service');
const { computeLine, computeTotals } = require('../utils/pricing');
const { orderNumber } = require('../utils/sequence');
const { publishableKey } = require('../config/stripe');

function addrToOrder(prefix, a) {
  return {
    [`${prefix}_recipient`]: a.recipient,
    [`${prefix}_line1`]: a.line1,
    [`${prefix}_line2`]: a.line2 || null,
    [`${prefix}_city`]: a.city,
    [`${prefix}_province`]: a.province || null,
    [`${prefix}_postal_code`]: a.postal_code,
    [`${prefix}_country`]: a.country || 'IT',
    [`${prefix}_phone`]: a.phone || null,
  };
}

// Valida una riga di carrello e la trasforma in riga d'ordine (snapshot).
function toOrderItem(item) {
  const v = item.variant;
  const p = v?.product;
  if (!v || !v.is_active || !p || !p.is_active) {
    throw AppError.conflict(`Articolo non più disponibile: ${p?.name || 'sconosciuto'}`);
  }
  if (v.stock < item.quantity) {
    throw AppError.conflict(`Disponibilità insufficiente per ${p.name} (${v.stock})`);
  }
  const vat = Number(p.vat_rate);
  const calc = computeLine(Number(item.unit_price), item.quantity, vat);
  return {
    product_variant_id: v.id,
    product_name: p.name,
    variant_name: v.name,
    sku: v.sku,
    unit_price: Number(item.unit_price),
    quantity: item.quantity,
    vat_rate: vat,
    ...calc,
  };
}

async function createCheckout(req, data) {
  const cart = await cartService.resolveCart(req, { create: false });
  if (!cart) throw AppError.badRequest('Carrello vuoto');
  const full = await cartService.loadCart(cart.id);
  if (!full.items || !full.items.length) throw AppError.badRequest('Carrello vuoto');

  const email = req.user ? req.user.email : data.email;
  if (!email) throw AppError.badRequest('Email obbligatoria per il checkout come ospite');

  const orderItems = full.items.map(toOrderItem);
  const totals = computeTotals(orderItems);
  const billing = data.same_billing === false ? data.billing : data.shipping;

  const order = await db.Order.create({
    order_number: orderNumber(),
    user_id: req.user ? req.user.id : null,
    email,
    status: 'pending',
    currency: 'eur',
    ...totals,
    ...addrToOrder('shipping', data.shipping),
    ...addrToOrder('billing', billing),
    billing_vat: data.billing_vat || null,
    notes: data.notes || null,
    placed_at: new Date(),
  });

  await db.OrderItem.bulkCreate(orderItems.map((oi) => ({ ...oi, order_id: order.id })));

  const intent = await stripeService.createIntentForOrder(order);

  const reloaded = await db.Order.findByPk(order.id, {
    include: [{ association: 'items' }, { association: 'payment' }],
  });

  return {
    order: orderService.serializeOrder(reloaded),
    payment: {
      client_secret: intent.client_secret,
      payment_intent_id: intent.payment_intent_id,
      simulated: intent.simulated,
      publishable_key: publishableKey || null,
    },
  };
}

module.exports = { createCheckout };
