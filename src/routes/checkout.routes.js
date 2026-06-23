'use strict';

const express = require('express');
const router = express.Router();

const { optionalAuth } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { checkoutSchema } = require('../validators/checkout.validator');
const ctrl = require('../controllers/checkout.controller');

/**
 * @swagger
 * tags:
 *   - name: Checkout
 *     description: Creazione ordine e avvio pagamento (utenti e guest)
 */

/**
 * @swagger
 * /checkout:
 *   post:
 *     summary: Crea l'ordine dal carrello e avvia il pagamento
 *     tags: [Checkout]
 *     responses:
 *       201: { description: Ordine creato con dati pagamento (client_secret) }
 */
router.post('/', optionalAuth, validate(checkoutSchema), ctrl.create);

module.exports = router;
