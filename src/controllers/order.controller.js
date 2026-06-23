'use strict';

const asyncHandler = require('../utils/async.handler');
const { sendSuccess } = require('../utils/http.response');
const orders = require('../services/order.service');
const db = require('../models');
const AppError = require('../errors/AppError');

// Cliente
const myList = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, await orders.listForUser(req.user.id, req.query)),
);
const myGet = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, await orders.getForUser(req.user.id, req.params.orderNumber)),
);

// Admin
const adminList = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, await orders.listAll(req.query)),
);
const adminGet = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, await orders.getByNumber(req.params.orderNumber)),
);

const STATUS_TIMESTAMP = {
  processing: null,
  shipped: 'shipped_at',
  delivered: 'delivered_at',
  cancelled: 'cancelled_at',
  refunded: null,
};

const adminUpdateStatus = asyncHandler(async (req, res) => {
  const order = await db.Order.findOne({ where: { order_number: req.params.orderNumber } });
  if (!order) throw AppError.notFound('Ordine non trovato');
  const { status } = req.body;
  order.status = status;
  const ts = STATUS_TIMESTAMP[status];
  if (ts) order[ts] = new Date();
  await order.save();
  const full = await db.Order.findByPk(order.id, {
    include: [{ association: 'items' }, { association: 'payment' }, { association: 'invoice' }],
  });
  return sendSuccess(res, 200, orders.serializeOrder(full));
});

module.exports = { myList, myGet, adminList, adminGet, adminUpdateStatus };
