'use strict';

// Controller HTTP del checkout. Risponde in JSend; errori async inoltrati
// all'error handler (Express 5).
const checkoutService = require('../services/checkout.service');
const { sendSuccess } = require('../utils/http.response');

async function createCheckout(req, res) {
  return sendSuccess(res, 201, await checkoutService.createCheckout(req, req.body));
}

async function simulatePayment(req, res) {
  return sendSuccess(res, 200, await checkoutService.simulatePayment(req.body.payment_intent_id));
}

// GET /stripe/session/:id — riconciliazione al ritorno su /checkout/success.
async function confirmSession(req, res) {
  return sendSuccess(res, 200, await checkoutService.reconcileSession(req.params.id));
}

// POST /stripe/webhook — sorgente primaria. NON in JSend: Stripe usa solo lo
// status code per decidere il retry. req.body è il raw Buffer (express.raw).
async function webhook(req, res) {
  const signature = req.headers['stripe-signature'];
  const result = await checkoutService.handleWebhook(req.body, signature);
  return res.status(200).json(result);
}

module.exports = { createCheckout, simulatePayment, confirmSession, webhook };
