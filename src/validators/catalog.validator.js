'use strict';

// Schema Joi per la query string del listato prodotti (GET /products).
// Allineato a ProductQuery del frontend. Normalizza tipi (numeri/boolean) e
// applica default di paginazione; i valori sconosciuti vengono scartati.
const Joi = require('joi');

const productQuery = Joi.object({
  q: Joi.string().trim().max(120).allow(''),
  category: Joi.string().trim().max(140), // slug categoria
  brand: Joi.string().trim().max(140), // slug brand
  condition: Joi.string().valid('new', 'used', 'refurbished'),
  featured: Joi.boolean(),
  min_price: Joi.number().min(0),
  max_price: Joi.number().min(0),
  sort: Joi.string().valid('price_asc', 'price_desc', 'newest', 'name').default('newest'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).custom((value, helpers) => {
  if (value.min_price != null && value.max_price != null && value.min_price > value.max_price) {
    return helpers.error('any.invalid', { message: 'min_price non può superare max_price' });
  }
  return value;
}, 'range check');

module.exports = { productQuery };
