'use strict';

const express = require('express');
const controller = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { uploadProductImages } = require('../middlewares/upload.middleware');
const schemas = require('../validators/admin.validator');

const router = express.Router();

// Tutte le rotte admin: autenticazione + ruolo admin.
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Area amministrativa (ruolo admin) — catalogo e ordini
 */

// ── Prodotti ──────────────────────────────────────────────────
router.get('/products', validate(schemas.listQuery, 'query'), controller.listProducts);
router.get('/products/:id', controller.getProduct);
router.post('/products', validate(schemas.createProduct), controller.createProduct);
router.put('/products/:id', validate(schemas.updateProduct), controller.updateProduct);
router.delete('/products/:id', controller.deleteProduct);
router.put('/products/:id/attributes', validate(schemas.setAttributes), controller.setAttributes);

// ── Varianti ──────────────────────────────────────────────────
router.post('/products/:productId/variants', validate(schemas.addVariant), controller.addVariant);
router.delete('/variants/:variantId', controller.deleteVariant);

// ── Immagini (multipart, campo 'images') ──────────────────────
router.post('/products/:productId/images', uploadProductImages, controller.addImages);
router.delete('/images/:imageId', controller.deleteImage);

// ── Ordini ────────────────────────────────────────────────────
router.get('/orders', validate(schemas.listQuery, 'query'), controller.listOrders);
router.patch(
  '/orders/:orderNumber/status',
  validate(schemas.updateOrderStatus),
  controller.updateOrderStatus,
);

module.exports = router;
