'use strict';

const Joi = require('joi');

const statusSchema = Joi.object({
  status: Joi.string()
    .valid('processing', 'shipped', 'delivered', 'cancelled', 'refunded')
    .required(),
});

module.exports = { statusSchema };
