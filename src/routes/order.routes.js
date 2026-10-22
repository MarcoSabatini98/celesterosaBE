'use strict';

const express = require('express');
const controller = require('../controllers/order.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// Tutte le rotte richiedono autenticazione (area cliente).
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Area ordini del cliente autenticato
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Elenco paginato degli ordini dell'utente
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Pagina di ordini }
 *       401: { description: Non autenticato }
 */
router.get('/', controller.listMyOrders);

/**
 * @swagger
 * /orders/{orderNumber}:
 *   get:
 *     summary: Dettaglio di un ordine
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderNumber
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Dettaglio ordine }
 *       404: { description: Ordine non trovato }
 */
router.get('/:orderNumber', controller.getMyOrder);

/**
 * @swagger
 * /orders/{orderNumber}/invoice:
 *   get:
 *     summary: Fattura dell'ordine (generata se assente)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderNumber
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Metadati fattura (number, status, pdf_url) }
 *       404: { description: Ordine non trovato }
 *       422: { description: Ordine non ancora pagato }
 */
router.get('/:orderNumber/invoice', controller.getInvoice);

module.exports = router;
