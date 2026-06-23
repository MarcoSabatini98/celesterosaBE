'use strict';

const Joi = require('joi');

const addressSchema = Joi.object({
  recipient: Joi.string().trim().min(1).max(160).required(),
  line1: Joi.string().trim().min(1).max(200).required(),
  line2: Joi.string().trim().max(200).allow('', null),
  city: Joi.string().trim().min(1).max(120).required(),
  province: Joi.string().trim().max(60).allow('', null),
  postal_code: Joi.string().trim().min(1).max(20).required(),
  country: Joi.string().trim().length(2).uppercase().default('IT'),
  phone: Joi.string().trim().max(30).allow('', null),
});

const checkoutSchema = Joi.object({
  // Per i guest l'email è obbligatoria; per gli utenti loggati si usa quella
  // dell'account (controllo applicato nel service).
  email: Joi.string().email().max(180),
  shipping: addressSchema.required(),
  same_billing: Joi.boolean().default(true),
  billing: Joi.when('same_billing', {
    is: false,
    then: addressSchema.required(),
    otherwise: Joi.optional(),
  }),
  billing_vat: Joi.string().trim().max(20).allow('', null),
  notes: Joi.string().max(1000).allow('', null),
});

const simulateSchema = Joi.object({
  payment_intent_id: Joi.string().trim().required(),
});

module.exports = { checkoutSchema, simulateSchema };
