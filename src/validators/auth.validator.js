'use strict';

const Joi = require('joi');

const password = Joi.string().min(8).max(128).messages({
  'string.min': 'La password deve avere almeno 8 caratteri',
});

const registerSchema = Joi.object({
  email: Joi.string().email().max(180).required(),
  password: password.required(),
  first_name: Joi.string().trim().min(1).max(80).required(),
  last_name: Joi.string().trim().min(1).max(80).required(),
  phone: Joi.string().trim().max(30).allow('', null),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema, refreshSchema };
