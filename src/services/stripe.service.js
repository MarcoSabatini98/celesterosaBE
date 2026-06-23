'use strict';

// Integrazione pagamenti. Con chiavi reali usa Stripe PaymentIntent; senza
// chiavi (placeholder) lavora in modalità SIMULATA generando intent fittizi,
// così l'intero flusso di checkout è testabile in locale.

const crypto = require('crypto');
const db = require('../models');
const logger = require('../utils/logger');
const AppError = require('../errors/AppError');
const { stripe, enabled, currency, webhookSecret } = require('../config/stripe');
const { round2 } = require('../utils/pricing');

// Crea l'intento di pagamento per un ordine e la relativa riga Payment.
async function createIntentForOrder(order) {
  const amountCents = Math.round(Number(order.grand_total) * 100);

  if (enabled) {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      metadata: { order_id: String(order.id), order_number: order.order_number },
      automatic_payment_methods: { enabled: true },
    });
    await db.Payment.create({
      order_id: order.id,
      provider: 'stripe',
      stripe_payment_intent_id: intent.id,
      amount: order.grand_total,
      currency,
      status: 'requires_payment',
    });
    return { client_secret: intent.client_secret, payment_intent_id: intent.id, simulated: false };
  }

  // Modalità simulata.
  const fakeId = `pi_sim_${crypto.randomUUID().replace(/-/g, '')}`;
  await db.Payment.create({
    order_id: order.id,
    provider: 'stripe_sim',
    stripe_payment_intent_id: fakeId,
    amount: order.grand_total,
    currency,
    status: 'requires_payment',
  });
  return { client_secret: `${fakeId}_secret_sim`, payment_intent_id: fakeId, simulated: true };
}

// Esegue gli effetti del pagamento riuscito: stato ordine/pagamento, scarico
// magazzino, conversione carrello. Idempotente. Restituisce l'ordine pagato.
async function fulfillPaidOrder(paymentIntentId, eventPayload = null) {
  return db.sequelize.transaction(async (t) => {
    const payment = await db.Payment.findOne({
      where: { stripe_payment_intent_id: paymentIntentId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!payment) throw AppError.notFound('Pagamento non trovato');

    const order = await db.Order.findByPk(payment.order_id, {
      include: [{ association: 'items' }],
      transaction: t,
    });
    if (!order) throw AppError.notFound('Ordine non trovato');

    if (payment.status === 'succeeded' && order.status === 'paid') {
      return order; // già processato
    }

    const now = new Date();
    payment.status = 'succeeded';
    payment.paid_at = now;
    if (eventPayload) payment.raw_event = eventPayload;
    await payment.save({ transaction: t });

    order.status = 'paid';
    order.paid_at = now;
    await order.save({ transaction: t });

    // Scarico magazzino.
    for (const item of order.items) {
      if (!item.product_variant_id) continue;
      const variant = await db.ProductVariant.findByPk(item.product_variant_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (variant) {
        variant.stock = Math.max(0, variant.stock - item.quantity);
        await variant.save({ transaction: t });
      }
    }

    // Converte il carrello associato all'utente/ordine.
    if (order.user_id) {
      await db.Cart.update(
        { status: 'converted' },
        { where: { user_id: order.user_id, status: 'active' }, transaction: t },
      );
    }

    return order;
  }).then(async (order) => {
    // Hook post-pagamento (fattura + email): implementato nella Fase 7.
    try {
      const onOrderPaid = require('./fulfillment.service');
      await onOrderPaid(order.id);
    } catch (err) {
      logger.warn(`Hook post-pagamento non eseguito: ${err.message}`);
    }
    return order;
  });
}

// Verifica la firma del webhook e processa gli eventi rilevanti.
async function handleWebhook(rawBody, signature) {
  if (!enabled) throw AppError.badRequest('Webhook Stripe non attivo in modalità simulata');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    throw new AppError(`Firma webhook non valida: ${err.message}`, 400);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await fulfillPaidOrder(event.data.object.id, event.data.object);
      logger.info(`Webhook: pagamento riuscito ${event.data.object.id}`);
      break;
    case 'payment_intent.payment_failed':
      await db.Payment.update(
        { status: 'failed', raw_event: event.data.object },
        { where: { stripe_payment_intent_id: event.data.object.id } },
      );
      break;
    default:
      logger.debug(`Webhook ignorato: ${event.type}`);
  }
  return { received: true, type: event.type };
}

// Simula la conferma di pagamento (solo modalità simulata).
async function simulatePayment(paymentIntentId) {
  if (enabled) throw AppError.forbidden('Simulazione non disponibile con Stripe reale');
  const payment = await db.Payment.findOne({ where: { stripe_payment_intent_id: paymentIntentId } });
  if (!payment) throw AppError.notFound('Pagamento non trovato');
  const order = await fulfillPaidOrder(paymentIntentId, { simulated: true, amount: round2(payment.amount) });
  return order;
}

module.exports = { createIntentForOrder, fulfillPaidOrder, handleWebhook, simulatePayment };
