'use strict';

// Accesso dati alle fatture.
const { Op } = require('sequelize');
const { Invoice, InvoiceItem } = require('../models');

function findByOrderId(orderId) {
  return Invoice.findOne({
    where: { order_id: orderId },
    include: [{ model: InvoiceItem, as: 'items', separate: true, order: [['id', 'ASC']] }],
  });
}

async function create(invoiceData, items, transaction) {
  const invoice = await Invoice.create(invoiceData, { transaction });
  await InvoiceItem.bulkCreate(
    items.map((it) => ({ ...it, invoice_id: invoice.id })),
    { transaction },
  );
  return invoice;
}

// Numero di fatture emesse nell'anno (per la numerazione progressiva).
function countForYear(year, transaction) {
  return Invoice.count({
    where: {
      issue_date: { [Op.gte]: `${year}-01-01`, [Op.lte]: `${year}-12-31` },
    },
    transaction,
  });
}

module.exports = { findByOrderId, create, countForYear };
