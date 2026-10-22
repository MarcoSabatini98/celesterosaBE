'use strict';

// Schemi Joi per le operazioni di amministrazione.
const Joi = require('joi');

const condition = Joi.string().valid('new', 'used', 'refurbished');

const createProduct = Joi.object({
  category_id: Joi.number().integer().positive().required(),
  brand_id: Joi.number().integer().positive().allow(null),
  sku: Joi.string().trim().max(64).required(),
  name: Joi.string().trim().max(200).required(),
  short_description: Joi.string().trim().max(500).allow('', null),
  description: Joi.string().trim().allow('', null),
  condition: condition.default('new'),
  base_price: Joi.number().min(0).required(),
  vat_rate: Joi.number().min(0).max(100).default(22),
  is_active: Joi.boolean().default(true),
  is_featured: Joi.boolean().default(false),
});

// Update: tutti i campi opzionali (PATCH-like via PUT), almeno uno richiesto.
const updateProduct = Joi.object({
  category_id: Joi.number().integer().positive(),
  brand_id: Joi.number().integer().positive().allow(null),
  sku: Joi.string().trim().max(64),
  name: Joi.string().trim().max(200),
  short_description: Joi.string().trim().max(500).allow('', null),
  description: Joi.string().trim().allow('', null),
  condition,
  base_price: Joi.number().min(0),
  vat_rate: Joi.number().min(0).max(100),
  is_active: Joi.boolean(),
  is_featured: Joi.boolean(),
}).min(1);

const addVariant = Joi.object({
  sku: Joi.string().trim().max(64).required(),
  name: Joi.string().trim().max(160).required(),
  color: Joi.string().trim().max(60).allow('', null),
  finish: Joi.string().trim().max(60).allow('', null),
  handedness: Joi.string().valid('right', 'left', 'na').default('na'),
  size: Joi.string().trim().max(40).allow('', null),
  price: Joi.number().min(0).allow(null),
  stock: Joi.number().integer().min(0).default(0),
  is_default: Joi.boolean().default(false),
  is_active: Joi.boolean().default(true),
});

// { attributes: { code: valore } }, valore string/number/boolean/null.
const setAttributes = Joi.object({
  attributes: Joi.object()
    .pattern(
      Joi.string(),
      Joi.alternatives(Joi.string().allow(''), Joi.number(), Joi.boolean(), Joi.valid(null)),
    )
    .required(),
});

// Transizioni di stato consentite dall'admin (vedi OrderStatusUpdate FE).
const updateOrderStatus = Joi.object({
  status: Joi.string()
    .valid('processing', 'shipped', 'delivered', 'cancelled', 'refunded')
    .required(),
});

const listQuery = Joi.object({
  q: Joi.string().trim().max(120).allow(''),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
  createProduct,
  updateProduct,
  addVariant,
  setAttributes,
  updateOrderStatus,
  listQuery,
};
