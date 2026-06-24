'use strict';

const express = require('express');
const controller = require('../controllers/catalog.controller');

const router = express.Router();

/**
 * @swagger
 * /brands:
 *   get:
 *     summary: Elenco dei brand attivi
 *     tags: [Catalog]
 *     responses:
 *       200:
 *         description: Elenco brand
 */
router.get('/', controller.listBrands);

module.exports = router;
