'use strict';

// Generazione e lettura delle fatture. Numerazione progressiva annuale,
// scomposizione IVA, PDF su MinIO.

const db = require('../models');
const AppError = require('../errors/AppError');
const { round2 } = require('../utils/pricing');
const { paginate, parsePageParams } = require('../utils/paginate');
const { invoiceNumber } = require('../utils/sequence');
const { buildInvoicePdf } = require('./pdf/invoice.pdf');
const storage = require('./storage.service');
const { publicUrl } = require('../config/minio');

const SELLER = {
  name: process.env.INVOICE_SELLER_NAME || 'celesterosa S.r.l.',
  vat: process.env.INVOICE_SELLER_VAT || 'IT00000000000',
  address: process.env.INVOICE_SELLER_ADDRESS || '',
};
const PREFIX = process.env.INVOICE_NUMBER_PREFIX || 'CEL';
const SHIPPING_VAT = 22;

function buildItems(order) {
  const items = order.items.map((it) => {
    const taxable = round2(it.line_taxable);
    return {
      description: it.variant_name ? `${it.product_name} - ${it.variant_name}` : it.product_name,
      quantity: it.quantity,
      unit_price: round2(taxable / it.quantity),
      vat_rate: round2(it.vat_rate),
      taxable_amount: taxable,
      vat_amount: round2(it.line_vat),
      total_amount: round2(it.line_total),
    };
  });

  if (Number(order.shipping_total) > 0) {
    const gross = round2(order.shipping_total);
    const taxable = round2(gross / (1 + SHIPPING_VAT / 100));
    items.push({
      description: 'Spedizione',
      quantity: 1,
      unit_price: taxable,
      vat_rate: SHIPPING_VAT,
      taxable_amount: taxable,
      vat_amount: round2(gross - taxable),
      total_amount: gross,
    });
  }
  return items;
}

async function nextInvoiceNumber(year) {
  const count = await db.Invoice.count({
    where: db.sequelize.where(
      db.sequelize.fn('YEAR', db.sequelize.col('issue_date')),
      year,
    ),
  });
  return invoiceNumber(PREFIX, year, count + 1);
}

// Genera (una sola volta) la fattura per un ordine pagato. Restituisce
// { invoice, pdfBuffer } per l'eventuale invio via email.
async function generateForOrder(orderId) {
  const order = await db.Order.findByPk(orderId, {
    include: [{ association: 'items' }, { association: 'invoice' }],
  });
  if (!order) throw AppError.notFound('Ordine non trovato');
  if (order.invoice) {
    return { invoice: order.invoice, pdfBuffer: null, alreadyExists: true };
  }

  const items = buildItems(order);
  const taxableTotal = round2(items.reduce((s, i) => s + i.taxable_amount, 0));
  const vatTotal = round2(items.reduce((s, i) => s + i.vat_amount, 0));
  const year = new Date().getFullYear();

  const customerName = order.billing_recipient || order.shipping_recipient || order.email;
  const customerAddress = [
    order.billing_line1 || order.shipping_line1,
    order.billing_postal_code || order.shipping_postal_code,
    order.billing_city || order.shipping_city,
    order.billing_province || order.shipping_province,
  ]
    .filter(Boolean)
    .join(', ');

  const invoice = await db.Invoice.create({
    invoice_number: await nextInvoiceNumber(year),
    order_id: order.id,
    user_id: order.user_id,
    issue_date: new Date().toISOString().slice(0, 10),
    seller_name: SELLER.name,
    seller_vat: SELLER.vat,
    seller_address: SELLER.address,
    customer_name: customerName,
    customer_vat: order.billing_vat || null,
    customer_address: customerAddress || null,
    customer_email: order.email,
    taxable_total: taxableTotal,
    vat_total: vatTotal,
    grand_total: round2(order.grand_total),
    currency: order.currency,
    status: order.status === 'paid' ? 'paid' : 'issued',
  });

  await db.InvoiceItem.bulkCreate(items.map((i) => ({ ...i, invoice_id: invoice.id })));

  const pdfBuffer = await buildInvoicePdf(invoice.get({ plain: true }), items);
  const key = await storage.uploadPdf(pdfBuffer, `invoices/${year}`);
  invoice.pdf_key = key;
  await invoice.save();

  return { invoice, pdfBuffer, alreadyExists: false };
}

function serialize(invoice) {
  return {
    invoice_number: invoice.invoice_number,
    issue_date: invoice.issue_date,
    status: invoice.status,
    taxable_total: round2(invoice.taxable_total),
    vat_total: round2(invoice.vat_total),
    grand_total: round2(invoice.grand_total),
    currency: invoice.currency,
    pdf_url: invoice.pdf_key ? publicUrl(invoice.pdf_key) : null,
  };
}

// Fattura di un ordine dell'utente (identificato dal numero ordine, più
// adatto agli URL del numero fattura che contiene "/").
async function getForUserByOrder(userId, orderNumber) {
  const order = await db.Order.findOne({ where: { order_number: orderNumber, user_id: userId } });
  if (!order) throw AppError.notFound('Ordine non trovato');
  const invoice = await db.Invoice.findOne({
    where: { order_id: order.id },
    include: [{ association: 'items' }],
  });
  if (!invoice) throw AppError.notFound('Fattura non ancora disponibile');
  return { ...serialize(invoice), items: invoice.items };
}

async function listAll(query = {}) {
  const { page, limit } = parsePageParams(query);
  const { count, rows } = await db.Invoice.findAndCountAll({
    order: [['created_at', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  return paginate(rows, count, page, limit, serialize);
}

module.exports = { generateForOrder, getForUserByOrder, listAll };
