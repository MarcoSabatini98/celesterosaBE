'use strict';

// Schemi Joi per gli endpoint di autenticazione. Usati dal middleware
// `validate` che normalizza (trim, lowercase email) e rifiuta campi extra.
const Joi = require('joi');

const email = Joi.string().trim().lowercase().email().max(180).required().messages({
  'string.email': 'Email non valida',
  'any.required': 'Email obbligatoria',
});

const password = Joi.string().min(8).max(128).required().messages({
  'string.min': 'La password deve avere almeno 8 caratteri',
  'any.required': 'Password obbligatoria',
});

const name = (label) =>
  Joi.string().trim().min(1).max(80).required().messages({
    'any.required': `${label} obbligatorio`,
    'string.empty': `${label} obbligatorio`,
  });

const register = Joi.object({
  email,
  password,
  first_name: name('Nome'),
  last_name: name('Cognome'),
  phone: Joi.string().trim().max(30).allow('', null),
});

const login = Joi.object({
  email,
  password: Joi.string().required().messages({ 'any.required': 'Password obbligatoria' }),
});

// Il refresh può arrivare nel body; opzionale perché in alternativa si legge
// dal cookie httpOnly.
const refresh = Joi.object({
  refresh_token: Joi.string().trim(),
});

module.exports = { register, login, refresh };
