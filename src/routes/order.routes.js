'use strict';

const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/order.controller');
const invoiceCtrl = require('../controllers/invoice.controller');

/**
 * @swagger
 * tags:
 *   - name: Ordini
 *     description: Storico ordini del cliente autenticato
 */

router.use(requireAuth);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Elenco ordini dell'utente
 *     tags: [Ordini]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Pagina di ordini }
 */
router.get('/', ctrl.myList);

/**
 * @swagger
 * /orders/{orderNumber}:
 *   get:
 *     summary: Dettaglio di un ordine dell'utente
 *     tags: [Ordini]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Ordine }
 *       404: { description: Non trovato }
 */
router.get('/:orderNumber', ctrl.myGet);

/**
 * @swagger
 * /orders/{orderNumber}/invoice:
 *   get:
 *     summary: Fattura PDF dell'ordine (URL al documento)
 *     tags: [Ordini]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dati fattura con pdf_url }
 *       404: { description: Non disponibile }
 */
router.get('/:orderNumber/invoice', invoiceCtrl.myInvoice);

module.exports = router;
