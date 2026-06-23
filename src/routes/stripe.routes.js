'use strict';

const express = require('express');
const router = express.Router();

const validate = require('../middlewares/validate.middleware');
const { simulateSchema } = require('../validators/checkout.validator');
const ctrl = require('../controllers/stripe.controller');

/**
 * @swagger
 * tags:
 *   - name: Pagamenti
 *     description: Webhook Stripe e simulazione pagamento (sandbox)
 */

// Webhook: il raw body (Buffer) è richiesto per verificare la firma HMAC.
// app.js salta express.json su questa path.
router.post('/webhook', express.raw({ type: 'application/json' }), ctrl.webhook);

/**
 * @swagger
 * /stripe/simulate-payment:
 *   post:
 *     summary: Conferma simulata del pagamento (solo modalità sandbox)
 *     tags: [Pagamenti]
 *     responses:
 *       200: { description: Ordine pagato }
 */
router.post('/simulate-payment', validate(simulateSchema), ctrl.simulate);

module.exports = router;
