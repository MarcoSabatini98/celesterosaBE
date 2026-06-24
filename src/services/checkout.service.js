'use strict';

// Logica del checkout in modalità sandbox simulata.
//   createCheckout: trasforma il carrello attivo in un ordine `pending` con
//     snapshot di righe e indirizzi, crea un Payment `requires_payment` con un
//     payment_intent simulato e marca il carrello come `converted`.
//   simulatePayment: conferma il pagamento (idempotente), porta l'ordine a
//     `paid` e scala lo stock delle varianti.
// I totali sono ricalcolati lato server dal carrello (mai dal client).

const crypto = require('crypto');
const { sequelize } = require('../models');
const AppError = require('../errors/AppError');
const cartService = require('../services/cart.service');
const orderRepository = require('../repositories/order.repository');
const { toCart } = require('../serializers/cart.serializer');
const { toOrder, toCheckoutResult } = require('../serializers/order.serializer');
const { generateOrderNumber } = require('../utils/order-number');

// Mappa un indirizzo del payload nelle colonne prefissate dell'ordine.
function addressColumns(prefix, addr) {
  return {
    [`${prefix}_recipient`]: addr.recipient,
    [`${prefix}_line1`]: addr.line1,
    [`${prefix}_line2`]: addr.line2 || null,
    [`${prefix}_city`]: addr.city,
    [`${prefix}_province`]: addr.province || null,
    [`${prefix}_postal_code`]: addr.postal_code,
    [`${prefix}_country`]: addr.country || 'IT',
    [`${prefix}_phone`]: addr.phone || null,
  };
}

async function createCheckout(req, payload) {
  const cart = await cartService.resolveCart(req, { create: false });
  if (!cart || !(cart.items || []).length) {
    throw AppError.unprocessable('Il carrello è vuoto');
  }

  const email = req.user?.email || payload.email;
  if (!email) throw AppError.unprocessable('Email obbligatoria per il checkout come ospite');

  const sameBilling = payload.same_billing !== false;
  const billing = sameBilling ? payload.shipping : payload.billing;

  // Totali e righe ricalcolati dal carrello (autorevoli, non dal client).
  const cartDto = toCart(cart);

  const orderNumber = generateOrderNumber();
  const paymentIntentId = `pi_sim_${crypto.randomBytes(12).toString('hex')}`;
  const clientSecret = `${paymentIntentId}_secret_${crypto.randomBytes(8).toString('hex')}`;

  const orderId = await sequelize.transaction(async (transaction) => {
    const order = await orderRepository.createOrder(
      {
        order_number: orderNumber,
        user_id: req.user?.id ?? null,
        email,
        status: 'pending',
        currency: 'eur',
        subtotal: cartDto.subtotal,
        vat_total: cartDto.vat_total,
        shipping_total: cartDto.shipping_total,
        grand_total: cartDto.grand_total,
        ...addressColumns('shipping', payload.shipping),
        ...addressColumns('billing', billing),
        billing_vat: payload.billing_vat || null,
        notes: payload.notes || null,
        placed_at: new Date(),
      },
      cartDto.items.map((i) => ({
        product_variant_id: i.variant_id,
        product_name: i.product_name,
        variant_name: i.variant_name,
        sku: i.sku,
        unit_price: i.unit_price,
        quantity: i.quantity,
        vat_rate: i.vat_rate,
        line_taxable: i.line_taxable,
        line_vat: i.line_vat,
        line_total: i.line_total,
      })),
      transaction,
    );

    await orderRepository.createPayment(
      {
        order_id: order.id,
        provider: 'stripe',
        stripe_payment_intent_id: paymentIntentId,
        amount: cartDto.grand_total,
        currency: 'eur',
        status: 'requires_payment',
      },
      transaction,
    );

    await cart.update({ status: 'converted' }, { transaction });
    return order.id;
  });

  const fullOrder = await orderRepository.reloadOrder(orderId);
  return toCheckoutResult(fullOrder, {
    client_secret: clientSecret,
    payment_intent_id: paymentIntentId,
    simulated: true,
    publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || null,
  });
}

async function simulatePayment(paymentIntentId) {
  const payment = await orderRepository.findPaymentByIntent(paymentIntentId);
  if (!payment) throw AppError.notFound('Pagamento non trovato');

  // Idempotente: se già riuscito, restituisce l'ordine così com'è.
  if (payment.status === 'succeeded') {
    return toOrder(await orderRepository.reloadOrder(payment.order_id));
  }

  await sequelize.transaction(async (transaction) => {
    const now = new Date();
    await payment.update({ status: 'succeeded', method: 'card', paid_at: now }, { transaction });
    await payment.order.update({ status: 'paid', paid_at: now }, { transaction });

    const items = await orderRepository.getItems(payment.order_id, transaction);
    await orderRepository.decrementStock(items, transaction);
  });

  return toOrder(await orderRepository.reloadOrder(payment.order_id));
}

module.exports = { createCheckout, simulatePayment };
