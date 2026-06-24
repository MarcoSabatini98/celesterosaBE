'use strict';

const express = require('express');
const controller = require('../controllers/checkout.controller');
const { validate } = require('../middlewares/validate.middleware');
const schemas = require('../validators/checkout.validator');

const router = express.Router();

/**
 * @swagger
 * /stripe/simulate-payment:
 *   post:
 *     summary: Conferma il pagamento in modalità sandbox simulata
 *     tags: [Checkout]
 *     responses:
 *       200:
 *         description: Ordine aggiornato a pagato
 *       404:
 *         description: Pagamento non trovato
 *       422:
 *         description: payment_intent_id mancante
 */
router.post('/simulate-payment', validate(schemas.simulatePayment), controller.simulatePayment);

// Nota: il webhook Stripe reale (/stripe/webhook) verrà aggiunto quando si
// passerà dai pagamenti simulati a quelli effettivi (è già esente da
// json/rate-limit in app.js).

module.exports = router;
