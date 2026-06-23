'use strict';

const asyncHandler = require('../utils/async.handler');
const { sendSuccess } = require('../utils/http.response');
const stripeService = require('../services/stripe.service');
const orderService = require('../services/order.service');

// Webhook Stripe: riceve il raw body (Buffer) per la verifica della firma.
const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const result = await stripeService.handleWebhook(req.body, signature);
  return res.status(200).json(result);
});

// Conferma simulata del pagamento (solo in modalità sandbox locale).
const simulate = asyncHandler(async (req, res) => {
  const order = await stripeService.simulatePayment(req.body.payment_intent_id);
  const full = await orderService.getByNumber(order.order_number);
  return sendSuccess(res, 200, full);
});

module.exports = { webhook, simulate };
