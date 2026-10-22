'use strict';

// Controller HTTP del carrello. Risponde in JSend; errori async inoltrati
// all'error handler (Express 5).
const cartService = require('../services/cart.service');
const { sendSuccess } = require('../utils/http.response');

async function getCart(req, res) {
  return sendSuccess(res, 200, await cartService.getCart(req));
}

async function addItem(req, res) {
  return sendSuccess(res, 200, await cartService.addItem(req, req.body));
}

async function updateItem(req, res) {
  return sendSuccess(res, 200, await cartService.updateItem(req, req.params.itemId, req.body));
}

async function removeItem(req, res) {
  return sendSuccess(res, 200, await cartService.removeItem(req, req.params.itemId));
}

async function clear(req, res) {
  return sendSuccess(res, 200, await cartService.clear(req));
}

module.exports = { getCart, addItem, updateItem, removeItem, clear };
