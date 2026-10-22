'use strict';

// Logica del checkout con Stripe in modalità sandbox/test.
//   createCheckout: trasforma il carrello attivo in un ordine `pending`, crea un
//     Payment `requires_payment` e — se Stripe è configurato — apre una
//     Checkout Session hosted (pagina checkout.stripe.com), restituendo
//     `payment_url` per il redirect del client. In assenza di chiavi Stripe
//     (dev/test) degrada al pagamento SIMULATO (`pi_sim_*` + simulate-payment).
//   reconcileSession: alla return su /checkout/success, rilegge la Session da
//     Stripe e finalizza l'ordine (fallback se il webhook è in ritardo/assente).
//   handleWebhook: sorgente primaria di verità — `checkout.session.completed`
//     porta l'ordine a `paid`, scala lo stock (idempotente sui retry Stripe).
//   simulatePayment: conferma il pagamento simulato (solo path senza chiavi).
// I totali sono ricalcolati lato server dal carrello (mai dal client).

const crypto = require('crypto');
const { sequelize } = require('../models');
const AppError = require('../errors/AppError');
const cartService = require('../services/cart.service');
const orderRepository = require('../repositories/order.repository');
const { toCart } = require('../serializers/cart.serializer');
const { toOrder, toCheckoutResult } = require('../serializers/order.serializer');
const { generateOrderNumber } = require('../utils/order-number');
const { stripe, currency, webhookSecret, publishableKey } = require('../config/stripe');
const logger = require('../utils/logger');

// URL del frontend per i redirect success/cancel della Checkout Session.
function frontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/+$/, '');
}

// Converte un importo (DECIMAL string o number) nei centesimi interi attesi
// da Stripe, con guard contro valori corrotti/NaN/<=0.
function toStripeAmount(price) {
  const cents = Math.round(Number(price) * 100);
  if (!Number.isInteger(cents) || cents <= 0) {
    throw AppError.unprocessable('Importo dell’ordine non valido');
  }
  return cents;
}

// Righe della Checkout Session dal carrello: una riga per articolo (prezzo
// lordo, IVA inclusa) + una riga spedizione se dovuta.
function buildLineItems(cartDto) {
  const items = cartDto.items.map((i) => ({
    quantity: i.quantity,
    price_data: {
      currency,
      unit_amount: toStripeAmount(i.unit_price),
      product_data: {
        name: i.variant_name ? `${i.product_name} — ${i.variant_name}` : i.product_name,
      },
    },
  }));
  if (Number(cartDto.shipping_total) > 0) {
    items.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: toStripeAmount(cartDto.shipping_total),
        product_data: { name: 'Spedizione' },
      },
    });
  }
  return items;
}

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
  const useStripe = !!stripe;
  // Senza chiavi Stripe (dev/test) si usa un payment intent simulato.
  const simIntent = useStripe ? null : `pi_sim_${crypto.randomBytes(12).toString('hex')}`;

  const orderId = await sequelize.transaction(async (transaction) => {
    const order = await orderRepository.createOrder(
      {
        order_number: orderNumber,
        user_id: req.user?.id ?? null,
        email,
        status: 'pending',
        currency,
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
        stripe_payment_intent_id: simIntent,
        amount: cartDto.grand_total,
        currency,
        status: 'requires_payment',
      },
      transaction,
    );

    await cart.update({ status: 'converted' }, { transaction });
    return order.id;
  });

  const fullOrder = await orderRepository.reloadOrder(orderId);

  // ── Path SIMULATO (nessuna chiave Stripe): comportamento legacy sandbox. ──
  if (!useStripe) {
    const clientSecret = `${simIntent}_secret_${crypto.randomBytes(8).toString('hex')}`;
    return toCheckoutResult(fullOrder, {
      client_secret: clientSecret,
      payment_intent_id: simIntent,
      simulated: true,
      publishable_key: null,
    });
  }

  // ── Path REALE: Stripe Checkout Session hosted. ──
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: buildLineItems(cartDto),
    // metadata.order_id è la chiave di riconciliazione usata da webhook e
    // reconcileSession per finalizzare l'ordine corretto.
    metadata: { order_id: String(orderId), order_number: orderNumber },
    success_url: `${frontendUrl()}/checkout/success?order=${encodeURIComponent(orderNumber)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl()}/checkout/cancel?order=${encodeURIComponent(orderNumber)}`,
  });

  // Lega il PaymentIntent della Session al Payment (per i webhook successivi).
  if (session.payment_intent) {
    await orderRepository.setPaymentIntent(orderId, session.payment_intent);
  }

  return toCheckoutResult(fullOrder, {
    payment_url: session.url,
    session_id: session.id,
    payment_intent_id: session.payment_intent || null,
    simulated: false,
    publishable_key: publishableKey || null,
  });
}

// Finalizza un pagamento andato a buon fine: Payment → succeeded, Order → paid,
// scala lo stock. Idempotente: se già succeeded è un no-op e ritorna l'ordine.
async function finalizePayment(payment, { method = 'card', chargeId = null, intentId = null } = {}) {
  if (payment.status === 'succeeded') {
    return orderRepository.reloadOrder(payment.order_id);
  }

  await sequelize.transaction(async (transaction) => {
    const now = new Date();
    const patch = { status: 'succeeded', method, paid_at: now };
    if (chargeId) patch.stripe_charge_id = chargeId;
    if (intentId && !payment.stripe_payment_intent_id) patch.stripe_payment_intent_id = intentId;
    await payment.update(patch, { transaction });
    await payment.order.update({ status: 'paid', paid_at: now }, { transaction });

    const items = await orderRepository.getItems(payment.order_id, transaction);
    await orderRepository.decrementStock(items, transaction);
  });

  return orderRepository.reloadOrder(payment.order_id);
}

// Pagamento SIMULATO (sandbox senza chiavi Stripe). Confermato dal FE.
async function simulatePayment(paymentIntentId) {
  const payment = await orderRepository.findPaymentByIntent(paymentIntentId);
  if (!payment) throw AppError.notFound('Pagamento non trovato');
  return toOrder(await finalizePayment(payment, { method: 'card' }));
}

// Riconciliazione alla return su /checkout/success: rilegge la Session da
// Stripe e, se pagata, finalizza l'ordine. Fallback al webhook (idempotente:
// se il webhook ha già finalizzato, finalizePayment è un no-op).
async function reconcileSession(sessionId) {
  if (!stripe) throw AppError.notFound('Pagamento non trovato');

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const orderId = parseInt(session?.metadata?.order_id, 10);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw AppError.notFound('Ordine non trovato per questa sessione');
  }

  const payment = await orderRepository.findPaymentByOrderId(orderId);
  if (!payment) throw AppError.notFound('Pagamento non trovato');

  if (session.payment_status === 'paid') {
    return toOrder(
      await finalizePayment(payment, {
        method: 'card',
        intentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      }),
    );
  }

  // Non ancora pagata (utente tornato indietro / pagamento in corso).
  return toOrder(await orderRepository.reloadOrder(orderId));
}

// Webhook Stripe — sorgente primaria. Verifica la firma HMAC col raw body.
async function handleWebhook(rawBody, signature) {
  if (!stripe || !webhookSecret) {
    throw AppError.badRequest('Webhook Stripe non configurato');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    // Firma non valida → 400 (Stripe non ritenta).
    throw AppError.badRequest(`Webhook non valido: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const orderId = parseInt(session?.metadata?.order_id, 10);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        logger.warn('stripe.webhook.invalid_order_id', { event_id: event.id });
        return { received: true, ignored: true };
      }
      const payment = await orderRepository.findPaymentByOrderId(orderId);
      if (!payment) {
        logger.warn('stripe.webhook.payment_not_found', { event_id: event.id, order_id: orderId });
        return { received: true, ignored: true };
      }
      await finalizePayment(payment, {
        method: 'card',
        intentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      });
      logger.info('stripe.webhook.order_paid', { event_id: event.id, order_id: orderId });
      return { received: true };
    }

    case 'checkout.session.expired': {
      logger.info('stripe.webhook.session_expired', { event_id: event.id });
      return { received: true };
    }

    default:
      logger.info('stripe.webhook.unhandled_event', { event_id: event.id, type: event.type });
      return { received: true };
  }
}

module.exports = { createCheckout, simulatePayment, reconcileSession, handleWebhook };
