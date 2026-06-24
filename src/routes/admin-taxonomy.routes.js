'use strict';

// Rotte admin per marche e categorie. Montate dentro admin.routes (ereditano
// authenticate + requireAdmin).
const express = require('express');
const controller = require('../controllers/taxonomy.controller');
const { validate } = require('../middlewares/validate.middleware');
const { uploadBrandLogo, uploadCategoryImage } = require('../middlewares/upload.middleware');
const schemas = require('../validators/taxonomy.validator');

const router = express.Router();

// ── Marche ────────────────────────────────────────────────────
router.get('/brands', controller.listBrands);
router.post('/brands', validate(schemas.createBrand), controller.createBrand);
router.put('/brands/:id', validate(schemas.updateBrand), controller.updateBrand);
router.delete('/brands/:id', controller.deleteBrand);
router.post('/brands/:id/logo', uploadBrandLogo, controller.setBrandLogo);

// ── Categorie ─────────────────────────────────────────────────
router.get('/categories', controller.listCategories);
router.post('/categories', validate(schemas.createCategory), controller.createCategory);
router.put('/categories/:id', validate(schemas.updateCategory), controller.updateCategory);
router.delete('/categories/:id', controller.deleteCategory);
router.post('/categories/:id/image', uploadCategoryImage, controller.setCategoryImage);

module.exports = router;
