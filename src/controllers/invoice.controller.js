'use strict';

const asyncHandler = require('../utils/async.handler');
const { sendSuccess } = require('../utils/http.response');
const invoices = require('../services/invoice.service');

// Fattura di un proprio ordine (per numero ordine).
const myInvoice = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, await invoices.getForUserByOrder(req.user.id, req.params.orderNumber)),
);

const adminList = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, await invoices.listAll(req.query)),
);

module.exports = { myInvoice, adminList };
