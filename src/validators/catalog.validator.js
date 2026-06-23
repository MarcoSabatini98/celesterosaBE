'use strict';

const Joi = require('joi');

// Query di listing prodotti: filtri, ordinamento e paginazione.
const productListSchema = Joi.object({
  q: Joi.string().trim().max(120).allow('', null),
  category: Joi.string().trim().max(140).allow('', null),
  brand: Joi.string().trim().max(140).allow('', null),
  condition: Joi.string().valid('new', 'used', 'refurbished').allow('', null),
  featured: Joi.boolean().truthy('true').falsy('false').allow(null),
  min_price: Joi.number().min(0).allow(null),
  max_price: Joi.number().min(0).allow(null),
  sort: Joi.string().valid('price_asc', 'price_desc', 'newest', 'name').default('newest'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(60).default(12),
});

module.exports = { productListSchema };
