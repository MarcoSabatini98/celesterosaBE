'use strict';

const express = require('express');
const router = express.Router();

const validate = require('../middlewares/validate.middleware');
const { productListSchema } = require('../validators/catalog.validator');
const ctrl = require('../controllers/catalog.controller');

/**
 * @swagger
 * tags:
 *   - name: Catalogo
 *     description: Categorie, brand e prodotti (pubblico)
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Albero gerarchico delle categorie attive
 *     tags: [Catalogo]
 *     responses:
 *       200: { description: Albero categorie }
 */
router.get('/categories', ctrl.categories);

/**
 * @swagger
 * /categories/{slug}:
 *   get:
 *     summary: Dettaglio categoria con i suoi attributi filtrabili
 *     tags: [Catalogo]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Categoria }
 *       404: { description: Non trovata }
 */
router.get('/categories/:slug', ctrl.category);

/**
 * @swagger
 * /brands:
 *   get:
 *     summary: Elenco brand attivi
 *     tags: [Catalogo]
 *     responses:
 *       200: { description: Brand }
 */
router.get('/brands', ctrl.brands);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Elenco prodotti con filtri, ricerca, ordinamento e paginazione
 *     tags: [Catalogo]
 *     parameters:
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: category, schema: { type: string }, description: slug categoria }
 *       - { in: query, name: brand, schema: { type: string }, description: slug brand }
 *       - { in: query, name: condition, schema: { type: string, enum: [new, used, refurbished] } }
 *       - { in: query, name: featured, schema: { type: boolean } }
 *       - { in: query, name: min_price, schema: { type: number } }
 *       - { in: query, name: max_price, schema: { type: number } }
 *       - { in: query, name: sort, schema: { type: string, enum: [price_asc, price_desc, newest, name] } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Pagina di prodotti }
 */
router.get('/products', validate(productListSchema, 'query'), ctrl.products);

/**
 * @swagger
 * /products/{slug}:
 *   get:
 *     summary: Dettaglio prodotto con varianti, immagini e attributi
 *     tags: [Catalogo]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Prodotto }
 *       404: { description: Non trovato }
 */
router.get('/products/:slug', ctrl.product);

module.exports = router;
