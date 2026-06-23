'use strict';

const Joi = require('joi');

const addItemSchema = Joi.object({
  variant_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).max(99).default(1),
});

const updateItemSchema = Joi.object({
  quantity: Joi.number().integer().min(0).max(99).required(),
});

module.exports = { addItemSchema, updateItemSchema };
