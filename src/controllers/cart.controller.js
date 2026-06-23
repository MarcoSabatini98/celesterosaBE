'use strict';

const asyncHandler = require('../utils/async.handler');
const { sendSuccess } = require('../utils/http.response');
const cart = require('../services/cart.service');

const get = asyncHandler(async (req, res) => sendSuccess(res, 200, await cart.getCart(req)));
const add = asyncHandler(async (req, res) => sendSuccess(res, 200, await cart.addItem(req, req.body)));
const update = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, await cart.updateItem(req, +req.params.itemId, req.body.quantity)),
);
const remove = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, await cart.removeItem(req, +req.params.itemId)),
);
const clear = asyncHandler(async (req, res) => sendSuccess(res, 200, await cart.clearCart(req)));

module.exports = { get, add, update, remove, clear };
