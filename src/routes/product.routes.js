'use strict';

const express = require('express');
const controller = require('../controllers/catalog.controller');
const { validate } = require('../middlewares/validate.middleware');
const { productQuery } = require('../validators/catalog.validator');

const router = express.Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Listato prodotti filtrato e paginato
 *     tags: [Catalog]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: slug categoria (include le sottocategorie)
 *       - in: query
 *         name: brand
 *         schema: { type: string }
 *         description: slug brand
 *       - in: query
 *         name: condition
 *         schema: { type: string, enum: [new, used, refurbished] }
 *       - in: query
 *         name: featured
 *         schema: { type: boolean }
 *       - in: query
 *         name: min_price
 *         schema: { type: number }
 *       - in: query
 *         name: max_price
 *         schema: { type: number }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [price_asc, price_desc, newest, name] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Pagina di prodotti
 *       422:
 *         description: Parametri di query non validi
 */
router.get('/', validate(productQuery, 'query'), controller.listProducts);

/**
 * @swagger
 * /products/{slug}:
 *   get:
 *     summary: Dettaglio prodotto (varianti, immagini, attributi)
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Dettaglio prodotto
 *       404:
 *         description: Prodotto non trovato
 */
router.get('/:slug', controller.getProduct);

module.exports = router;
