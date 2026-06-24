'use strict';

// Controller HTTP dell'area ordini cliente. Risponde in JSend; errori async
// inoltrati all'error handler (Express 5).
const orderService = require('../services/order.service');
const { sendSuccess } = require('../utils/http.response');

async function listMyOrders(req, res) {
  return sendSuccess(res, 200, await orderService.myOrders(req.user, req.query));
}

async function getMyOrder(req, res) {
  return sendSuccess(res, 200, await orderService.myOrder(req.user, req.params.orderNumber));
}

async function getInvoice(req, res) {
  return sendSuccess(res, 200, await orderService.getInvoice(req.user, req.params.orderNumber));
}

module.exports = { listMyOrders, getMyOrder, getInvoice };
