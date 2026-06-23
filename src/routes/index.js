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

// Le altre route (catalog, cart, orders, admin, stripe...) verranno montate
// qui nelle fasi successive.

module.exports = router;
