'use strict';

// Schemi Joi per il checkout. L'indirizzo di fatturazione è obbligatorio solo
// se diverso da quello di spedizione (same_billing=false).
const Joi = require('joi');

const address = Joi.object({
  recipient: Joi.string().trim().max(160).required(),
  line1: Joi.string().trim().max(200).required(),
  line2: Joi.string().trim().max(200).allow('', null),
  city: Joi.string().trim().max(120).required(),
  province: Joi.string().trim().max(60).allow('', null),
  postal_code: Joi.string().trim().max(20).required(),
  country: Joi.string().trim().length(2).uppercase().default('IT'),
  phone: Joi.string().trim().max(30).allow('', null),
});

const checkout = Joi.object({
  // Obbligatoria per i guest; per gli utenti autenticati si usa la loro email.
  email: Joi.string().trim().lowercase().email().max(180),
  shipping: address.required(),
  same_billing: Joi.boolean().default(true),
  billing: address.when('same_billing', {
    is: false,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  billing_vat: Joi.string().trim().max(20).allow('', null),
  notes: Joi.string().trim().max(1000).allow('', null),
});

const simulatePayment = Joi.object({
  payment_intent_id: Joi.string().trim().required().messages({
    'any.required': 'payment_intent_id obbligatorio',
  }),
});

module.exports = { checkout, simulatePayment };
