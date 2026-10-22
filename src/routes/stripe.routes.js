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

/**
 * @swagger
 * /stripe/session/{id}:
 *   get:
 *     summary: Riconcilia una Checkout Session al ritorno su /checkout/success
 *     tags: [Checkout]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ordine aggiornato (paid se la session è pagata)
 *       404:
 *         description: Sessione/ordine non trovato
 */
router.get('/session/:id', controller.confirmSession);

/**
 * @swagger
 * /stripe/webhook:
 *   post:
 *     summary: Webhook Stripe (checkout.session.completed → ordine paid)
 *     tags: [Checkout]
 *     description: Verifica la firma HMAC sul raw body. Esente da json/rate-limit in app.js.
 *     responses:
 *       200:
 *         description: Evento ricevuto
 *       400:
 *         description: Firma webhook non valida
 */
// express.raw qui è single source of truth per il Buffer richiesto da
// stripe.webhooks.constructEvent: app.js salta express.json() su questo path.
router.post('/webhook', express.raw({ type: 'application/json' }), controller.webhook);

module.exports = router;
