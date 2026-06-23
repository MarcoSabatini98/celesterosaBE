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

// Moduli applicativi.
router.use('/auth', require('./auth.routes'));
router.use('/', require('./catalog.routes'));
router.use('/cart', require('./cart.routes'));
router.use('/checkout', require('./checkout.routes'));
router.use('/orders', require('./order.routes'));
router.use('/stripe', require('./stripe.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
