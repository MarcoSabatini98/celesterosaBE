'use strict';

const express = require('express');
const controller = require('../controllers/cart.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const schemas = require('../validators/cart.validator');

const router = express.Router();

// optionalAuth: se presente un access token valido, lega il carrello
// all'utente; altrimenti si usa l'header X-Cart-Token (guest).
router.use(optionalAuth);

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Carrello (utente autenticato o guest via X-Cart-Token)
 */

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Carrello corrente (o vuoto)
 *     tags: [Cart]
 *     responses:
 *       200: { description: Carrello }
 *   delete:
 *     summary: Svuota il carrello
 *     tags: [Cart]
 *     responses:
 *       200: { description: Carrello svuotato }
 */
router.get('/', controller.getCart);
router.delete('/', controller.clear);

/**
 * @swagger
 * /cart/items:
 *   post:
 *     summary: Aggiunge una variante al carrello
 *     tags: [Cart]
 *     responses:
 *       200: { description: Carrello aggiornato }
 *       404: { description: Variante non trovata }
 *       422: { description: Quantità non valida o stock insufficiente }
 */
router.post('/items', validate(schemas.addItem), controller.addItem);

/**
 * @swagger
 * /cart/items/{itemId}:
 *   put:
 *     summary: Aggiorna la quantità di una riga
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Carrello aggiornato }
 *       404: { description: Articolo non nel carrello }
 *   delete:
 *     summary: Rimuove una riga dal carrello
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Carrello aggiornato }
 */
router.put('/items/:itemId', validate(schemas.updateItem), controller.updateItem);
router.delete('/items/:itemId', controller.removeItem);

module.exports = router;
