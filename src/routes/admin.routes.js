'use strict';

const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants/roles');
const validate = require('../middlewares/validate.middleware');
const { upload } = require('../config/upload');
const v = require('../validators/admin.validator');
const ctrl = require('../controllers/admin.catalog.controller');

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Backoffice catalogo (solo ruolo admin)
 */

// Tutte le rotte admin richiedono autenticazione + ruolo admin.
router.use(requireAuth, requireRole(ROLES.ADMIN));

// ── Brand ──
router.post('/brands', validate(v.brandSchema), ctrl.createBrand);
router.put('/brands/:id', validate(v.brandSchema), ctrl.updateBrand);
router.delete('/brands/:id', ctrl.deleteBrand);

// ── Categorie ──
router.post('/categories', validate(v.categorySchema), ctrl.createCategory);
router.put('/categories/:id', validate(v.categorySchema), ctrl.updateCategory);
router.delete('/categories/:id', ctrl.deleteCategory);
router.post('/categories/:id/attributes', validate(v.attributeDefSchema), ctrl.createAttributeDefinition);

// ── Prodotti ──
router.get('/products', ctrl.listProducts);
router.get('/products/:id', ctrl.getProduct);
router.post('/products', validate(v.productSchema), ctrl.createProduct);
router.put('/products/:id', validate(v.productUpdateSchema), ctrl.updateProduct);
router.delete('/products/:id', ctrl.deleteProduct);
router.put('/products/:id/attributes', validate(v.attributesSchema), ctrl.setAttributes);

// ── Varianti ──
router.post('/products/:id/variants', validate(v.variantSchema), ctrl.addVariant);
router.put('/variants/:variantId', validate(v.variantUpdateSchema), ctrl.updateVariant);
router.delete('/variants/:variantId', ctrl.deleteVariant);

// ── Immagini (multipart) ──
router.post('/products/:id/images', upload.array('images', 8), ctrl.addImages);
router.delete('/images/:imageId', ctrl.deleteImage);

module.exports = router;
