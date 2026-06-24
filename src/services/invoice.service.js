'use strict';

// Generazione/recupero della fattura di un ordine. La fattura è creata una
// sola volta (idempotente per ordine) con numerazione progressiva annuale. Il
// PDF è generato con pdf-lib e caricato su MinIO; l'upload è saltato in ambiente
// di test e tollerante ai guasti (se MinIO non è raggiungibile, la fattura
// resta valida con pdf_url null).

const { sequelize } = require('../models');
const logger = require('../utils/logger');
const invoiceRepository = require('../repositories/invoice.repository');
const { buildInvoicePdf } = require('../utils/invoice-pdf');
const storage = require('../utils/storage');

const PREFIX = process.env.INVOICE_NUMBER_PREFIX || 'CEL';
const DEFAULT_VAT = Number(process.env.INVOICE_VAT_RATE || 22);

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Indirizzo del cessionario: preferisce i dati di fatturazione, poi spedizione.
function customerAddress(order) {
  const p = order.billing_line1 ? 'billing' : 'shipping';
  const parts = [
    order[`${p}_line1`],
    order[`${p}_line2`],
    [order[`${p}_postal_code`], order[`${p}_city`]].filter(Boolean).join(' '),
    order[`${p}_province`],
    order[`${p}_country`],
  ].filter(Boolean);
  return parts.join(', ') || null;
}

// Righe fattura dalle righe d'ordine + eventuale spedizione (scorporata).
function buildItems(order) {
  const items = (order.items || []).map((oi) => ({
    description: oi.variant_name ? `${oi.product_name} (${oi.variant_name})` : oi.product_name,
    quantity: oi.quantity,
    unit_price: Number(oi.unit_price),
    vat_rate: Number(oi.vat_rate),
    taxable_amount: Number(oi.line_taxable),
    vat_amount: Number(oi.line_vat),
    total_amount: Number(oi.line_total),
  }));

  const shipping = Number(order.shipping_total);
  if (shipping > 0) {
    const taxable = round2(shipping / (1 + DEFAULT_VAT / 100));
    items.push({
      description: 'Spedizione',
      quantity: 1,
      unit_price: shipping,
      vat_rate: DEFAULT_VAT,
      taxable_amount: taxable,
      vat_amount: round2(shipping - taxable),
      total_amount: shipping,
    });
  }
  return items;
}

async function generateNumber(transaction) {
  const year = new Date().getFullYear();
  const seq = (await invoiceRepository.countForYear(year, transaction)) + 1;
  return `${PREFIX}/${year}/${String(seq).padStart(5, '0')}`;
}

// Carica il PDF su MinIO (best-effort). Saltato in test.
async function tryStorePdf(invoice, items) {
  if (process.env.NODE_ENV === 'test') return null;
  try {
    const pdf = await buildInvoicePdf(invoice, items);
    const key = `invoices/${invoice.invoice_number.replace(/[/\\]/g, '-')}.pdf`;
    await storage.putObject(key, pdf, 'application/pdf');
    await invoice.update({ pdf_key: key });
    return key;
  } catch (err) {
    logger.warn(`Upload PDF fattura fallito (${invoice.invoice_number}): ${err.message}`);
    return null;
  }
}

// Restituisce la fattura dell'ordine, creandola se non esiste. L'ordine deve
// essere già caricato con le sue righe.
async function ensureInvoice(order) {
  const existing = await invoiceRepository.findByOrderId(order.id);
  if (existing) return existing;

  const items = buildItems(order);
  const taxableTotal = round2(items.reduce((s, i) => s + i.taxable_amount, 0));
  const vatTotal = round2(items.reduce((s, i) => s + i.vat_amount, 0));
  const grandTotal = round2(items.reduce((s, i) => s + i.total_amount, 0));

  const invoice = await sequelize.transaction(async (transaction) => {
    const invoiceNumber = await generateNumber(transaction);
    return invoiceRepository.create(
      {
        invoice_number: invoiceNumber,
        order_id: order.id,
        user_id: order.user_id ?? null,
        issue_date: today(),
        seller_name: process.env.INVOICE_SELLER_NAME || 'celesterosa S.r.l.',
        seller_vat: process.env.INVOICE_SELLER_VAT || 'IT00000000000',
        seller_address: process.env.INVOICE_SELLER_ADDRESS || '—',
        customer_name: order.billing_recipient || order.shipping_recipient || order.email,
        customer_vat: order.billing_vat || null,
        customer_address: customerAddress(order),
        customer_email: order.email,
        taxable_total: taxableTotal,
        vat_total: vatTotal,
        grand_total: grandTotal,
        currency: order.currency || 'eur',
        status: 'issued',
      },
      items,
      transaction,
    );
  });

  await tryStorePdf(invoice, items);
  return invoice;
}

module.exports = { ensureInvoice };
