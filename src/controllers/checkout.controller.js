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

module.exports = { createCheckout, simulatePayment };
