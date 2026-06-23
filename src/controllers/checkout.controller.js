'use strict';

const asyncHandler = require('../utils/async.handler');
const { sendSuccess } = require('../utils/http.response');
const checkout = require('../services/checkout.service');

const create = asyncHandler(async (req, res) =>
  sendSuccess(res, 201, await checkout.createCheckout(req, req.body)),
);

module.exports = { create };
