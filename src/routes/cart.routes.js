'use strict';

const express = require('express');
const router = express.Router();

const { optionalAuth } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { addItemSchema, updateItemSchema } = require('../validators/cart.validator');
const ctrl = require('../controllers/cart.controller');

/**
 * @swagger
 * tags:
 *   - name: Carrello
 *     description: Carrello per utenti e guest (header X-Cart-Token per i guest)
 */

// optionalAuth: funziona sia da loggati sia da guest.
router.use(optionalAuth);

router.get('/', ctrl.get);
router.post('/items', validate(addItemSchema), ctrl.add);
router.put('/items/:itemId', validate(updateItemSchema), ctrl.update);
router.delete('/items/:itemId', ctrl.remove);
router.delete('/', ctrl.clear);

module.exports = router;
