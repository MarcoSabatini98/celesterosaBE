'use strict';

const express = require('express');
const controller = require('../controllers/checkout.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const schemas = require('../validators/checkout.validator');

const router = express.Router();

// optionalAuth: il checkout funziona sia per utenti autenticati sia per guest
// (carrello via X-Cart-Token, email nel payload).
router.use(optionalAuth);

/**
 * @swagger
 * tags:
 *   name: Checkout
 *   description: Creazione ordine e pagamento (sandbox simulato)
 */

/**
 * @swagger
 * /checkout:
 *   post:
 *     summary: Crea un ordine dal carrello corrente
 *     tags: [Checkout]
 *     responses:
 *       201:
 *         description: Ordine creato, payment intent simulato
 *       422:
 *         description: Carrello vuoto o dati non validi
 */
router.post('/', validate(schemas.checkout), controller.createCheckout);

module.exports = router;
