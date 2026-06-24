'use strict';

const express = require('express');
const router = express.Router();
const { sendSuccess } = require('../utils/http.response');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check del servizio
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Servizio attivo
 */
router.get('/health', (req, res) =>
  sendSuccess(res, 200, { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }),
);

// ── Moduli applicativi ────────────────────────────────────────
router.use('/auth', require('./auth.routes'));

// Catalogo pubblico
router.use('/categories', require('./category.routes'));
router.use('/brands', require('./brand.routes'));
router.use('/products', require('./product.routes'));

// Carrello (utente o guest)
router.use('/cart', require('./cart.routes'));

// Checkout + pagamento (sandbox simulato)
router.use('/checkout', require('./checkout.routes'));
router.use('/stripe', require('./stripe.routes'));

// Area ordini cliente
router.use('/orders', require('./order.routes'));

// Area amministrativa (ruolo admin)
router.use('/admin', require('./admin.routes'));

module.exports = router;
