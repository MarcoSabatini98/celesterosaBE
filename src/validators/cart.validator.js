'use strict';

// Schemi Joi per le operazioni sul carrello.
const Joi = require('joi');

const addItem = Joi.object({
  variant_id: Joi.number().integer().positive().required().messages({
    'any.required': 'variant_id obbligatorio',
  }),
  quantity: Joi.number().integer().min(1).max(99).default(1),
});

const updateItem = Joi.object({
  quantity: Joi.number().integer().min(1).max(99).required().messages({
    'any.required': 'quantity obbligatoria',
  }),
});

module.exports = { addItem, updateItem };
