'use strict';

const express = require('express');
const controller = require('../controllers/catalog.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Catalog
 *   description: Catalogo pubblico (categorie, brand, prodotti)
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Albero delle categorie (top-level con figlie)
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: Elenco categorie
 */
router.get('/', controller.listCategories);

/**
 * @swagger
 * /categories/{slug}:
 *   get:
 *     summary: Dettaglio categoria con gli attributi EAV definiti
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Dettaglio categoria
 *       404:
 *         description: Categoria non trovata
 */
router.get('/:slug', controller.getCategory);

module.exports = router;
