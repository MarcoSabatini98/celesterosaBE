'use strict';

// Schemi Joi per la gestione admin di marche e categorie.
const Joi = require('joi');

const createBrand = Joi.object({
  name: Joi.string().trim().max(120).required(),
  description: Joi.string().trim().allow('', null),
  website: Joi.string().trim().uri().max(255).allow('', null),
  is_active: Joi.boolean().default(true),
});

const updateBrand = Joi.object({
  name: Joi.string().trim().max(120),
  description: Joi.string().trim().allow('', null),
  website: Joi.string().trim().uri().max(255).allow('', null),
  is_active: Joi.boolean(),
}).min(1);

const createCategory = Joi.object({
  name: Joi.string().trim().max(120).required(),
  description: Joi.string().trim().allow('', null),
  parent_id: Joi.number().integer().positive().allow(null),
  sort_order: Joi.number().integer().min(0).default(0),
  is_active: Joi.boolean().default(true),
});

const updateCategory = Joi.object({
  name: Joi.string().trim().max(120),
  description: Joi.string().trim().allow('', null),
  parent_id: Joi.number().integer().positive().allow(null),
  sort_order: Joi.number().integer().min(0),
  is_active: Joi.boolean(),
}).min(1);

module.exports = { createBrand, updateBrand, createCategory, updateCategory };
