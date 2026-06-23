'use strict';

const Joi = require('joi');

const brandSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  description: Joi.string().allow('', null),
  website: Joi.string().uri().allow('', null),
  is_active: Joi.boolean(),
});

const categorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  description: Joi.string().allow('', null),
  parent_id: Joi.number().integer().positive().allow(null),
  sort_order: Joi.number().integer(),
  is_active: Joi.boolean(),
});

const attributeDefSchema = Joi.object({
  code: Joi.string().trim().lowercase().pattern(/^[a-z0-9_]+$/).max(80).required(),
  label: Joi.string().trim().min(1).max(120).required(),
  data_type: Joi.string().valid('string', 'number', 'date', 'boolean', 'enum').required(),
  options: Joi.array().items(Joi.string()).when('data_type', {
    is: 'enum',
    then: Joi.required(),
    otherwise: Joi.optional().allow(null),
  }),
  unit: Joi.string().max(20).allow('', null),
  is_required: Joi.boolean(),
  is_filterable: Joi.boolean(),
  sort_order: Joi.number().integer(),
});

const productSchema = Joi.object({
  category_id: Joi.number().integer().positive().required(),
  brand_id: Joi.number().integer().positive().allow(null),
  sku: Joi.string().trim().max(64).required(),
  name: Joi.string().trim().min(1).max(200).required(),
  short_description: Joi.string().max(500).allow('', null),
  description: Joi.string().allow('', null),
  condition: Joi.string().valid('new', 'used', 'refurbished'),
  base_price: Joi.number().min(0).required(),
  vat_rate: Joi.number().min(0).max(100),
  is_active: Joi.boolean(),
  is_featured: Joi.boolean(),
});

// In update tutti i campi sono opzionali.
const productUpdateSchema = productSchema.fork(
  ['category_id', 'sku', 'name', 'base_price'],
  (s) => s.optional(),
);

const variantSchema = Joi.object({
  sku: Joi.string().trim().max(64).required(),
  name: Joi.string().trim().min(1).max(160).required(),
  color: Joi.string().max(60).allow('', null),
  finish: Joi.string().max(60).allow('', null),
  handedness: Joi.string().valid('right', 'left', 'na'),
  size: Joi.string().max(40).allow('', null),
  price: Joi.number().min(0).allow(null),
  stock: Joi.number().integer().min(0),
  weight_grams: Joi.number().integer().min(0).allow(null),
  is_default: Joi.boolean(),
  is_active: Joi.boolean(),
});

const variantUpdateSchema = variantSchema.fork(['sku', 'name'], (s) => s.optional());

// Set attributi EAV: mappa { code: valore }.
const attributesSchema = Joi.object({
  attributes: Joi.object().pattern(Joi.string(), Joi.any()).required(),
});

module.exports = {
  brandSchema,
  categorySchema,
  attributeDefSchema,
  productSchema,
  productUpdateSchema,
  variantSchema,
  variantUpdateSchema,
  attributesSchema,
};
