'use strict';

// Ordini demo in vari stati, con pagamenti e (per gli ordini pagati) fatture.
// Numeri d'ordine deterministici → idempotente. NON scala lo stock (dati demo).

const db = require('../../src/models');

const PREFIX = process.env.INVOICE_NUMBER_PREFIX || 'CEL';
const FLAT = Number(process.env.SHIPPING_FLAT ?? 9.9);
const FREE = Number(process.env.SHIPPING_FREE_THRESHOLD ?? 99);

const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

// Specifiche degli ordini demo (prezzi IVA inclusa, snapshot al volo dal seed).
const ORDERS = [
  { num: 'CEL-SEED-0001', email: 'giulia.bianchi@example.com', status: 'delivered', items: [{ sku: 'GTR-FG800', qty: 1 }] },
  { num: 'CEL-SEED-0002', email: 'luca.verdi@example.com', status: 'shipped', items: [{ sku: 'FX-DS1', qty: 2 }] },
  { num: 'CEL-SEED-0003', email: 'sara.neri@example.com', status: 'paid', items: [{ sku: 'MIC-SM58', qty: 1 }] },
  { num: 'CEL-SEED-0004', email: 'marco.ferrari@example.com', status: 'processing', items: [{ sku: 'AUD-SCARLETT-2I2', qty: 1 }], billing_vat: 'IT01234567890' },
  { num: 'CEL-SEED-0005', email: 'giulia.bianchi@example.com', status: 'pending', items: [{ sku: 'ACC-STR-ELEC', qty: 2 }] },
  { num: 'CEL-SEED-0006', email: 'ospite@demo.it', guest: true, status: 'delivered', items: [{ sku: 'KEY-P125', qty: 1 }] },
  { num: 'CEL-SEED-0007', email: 'luca.verdi@example.com', status: 'cancelled', items: [{ sku: 'FX-BD2', qty: 1 }] },
];

const PAID_STATES = new Set(['paid', 'processing', 'shipped', 'delivered']);

function statusTimestamps(status, base) {
  const ts = { placed_at: base };
  if (PAID_STATES.has(status)) ts.paid_at = base;
  if (status === 'shipped' || status === 'delivered') ts.shipped_at = base;
  if (status === 'delivered') ts.delivered_at = base;
  if (status === 'cancelled') ts.cancelled_at = base;
  return ts;
}

module.exports = {
  async up() {
    let invoiceSeq = await db.Invoice.count();

    for (const spec of ORDERS) {
      const [order, created] = await db.Order.findOrCreate({
        where: { order_number: spec.num },
        defaults: { order_number: spec.num, email: spec.email, status: 'pending' },
      });
      if (!created) continue;

      const user = spec.guest ? null : await db.User.findOne({ where: { email: spec.email } });
      const address = user
        ? await db.Address.findOne({ where: { user_id: user.id, type: 'shipping' } })
        : null;

      // Righe + totali (snapshot dai prodotti seed).
      const lines = [];
      for (const it of spec.items) {
        const product = await db.Product.findOne({ where: { sku: it.sku } });
        if (!product) continue;
        const variant = await db.ProductVariant.findOne({
          where: { product_id: product.id },
          order: [['is_default', 'DESC'], ['id', 'ASC']],
        });
        const unit = variant?.price != null ? Number(variant.price) : Number(product.base_price);
        const vat = Number(product.vat_rate);
        const lineTotal = round2(unit * it.qty);
        const taxable = round2(lineTotal / (1 + vat / 100));
        lines.push({
          product,
          variant,
          quantity: it.qty,
          unit_price: unit,
          vat_rate: vat,
          line_total: lineTotal,
          line_taxable: taxable,
          line_vat: round2(lineTotal - taxable),
        });
      }

      const gross = round2(lines.reduce((s, l) => s + l.line_total, 0));
      const vatTotal = round2(lines.reduce((s, l) => s + l.line_vat, 0));
      const shipping = gross >= FREE ? 0 : FLAT;
      const when = new Date();

      const recipient = address?.recipient_name || (user ? `${user.first_name} ${user.last_name}` : 'Cliente Ospite');
      await order.update({
        user_id: user ? user.id : null,
        email: spec.email,
        status: spec.status,
        currency: 'eur',
        subtotal: round2(gross - vatTotal),
        vat_total: vatTotal,
        shipping_total: shipping,
        grand_total: round2(gross + shipping),
        shipping_recipient: recipient,
        shipping_line1: address?.line1 || 'Via Demo 1',
        shipping_city: address?.city || 'Roma',
        shipping_province: address?.province || 'RM',
        shipping_postal_code: address?.postal_code || '00100',
        shipping_country: address?.country || 'IT',
        shipping_phone: address?.phone || null,
        billing_recipient: recipient,
        billing_line1: address?.line1 || 'Via Demo 1',
        billing_city: address?.city || 'Roma',
        billing_province: address?.province || 'RM',
        billing_postal_code: address?.postal_code || '00100',
        billing_country: address?.country || 'IT',
        billing_vat: spec.billing_vat || null,
        ...statusTimestamps(spec.status, when),
      });

      // Righe d'ordine.
      for (const l of lines) {
        await db.OrderItem.create({
          order_id: order.id,
          product_variant_id: l.variant ? l.variant.id : null,
          product_name: l.product.name,
          variant_name: l.variant ? l.variant.name : null,
          sku: l.variant ? l.variant.sku : l.product.sku,
          unit_price: l.unit_price,
          quantity: l.quantity,
          vat_rate: l.vat_rate,
          line_taxable: l.line_taxable,
          line_vat: l.line_vat,
          line_total: l.line_total,
        });
      }

      // Pagamento.
      const payStatus =
        spec.status === 'cancelled' ? 'canceled' : spec.status === 'pending' ? 'requires_payment' : 'succeeded';
      await db.Payment.create({
        order_id: order.id,
        provider: 'stripe',
        stripe_payment_intent_id: `pi_seed_${spec.num}`,
        amount: round2(gross + shipping),
        currency: 'eur',
        status: payStatus,
        method: payStatus === 'succeeded' ? 'card' : null,
        paid_at: payStatus === 'succeeded' ? when : null,
      });

      // Fattura per gli ordini pagati.
      if (PAID_STATES.has(spec.status)) {
        invoiceSeq += 1;
        const invoiceNumber = `${PREFIX}/${when.getFullYear()}/${String(invoiceSeq).padStart(5, '0')}`;
        const invoiceItems = lines.map((l) => ({
          description: l.variant ? `${l.product.name} (${l.variant.name})` : l.product.name,
          quantity: l.quantity,
          unit_price: l.unit_price,
          vat_rate: l.vat_rate,
          taxable_amount: l.line_taxable,
          vat_amount: l.line_vat,
          total_amount: l.line_total,
        }));
        if (shipping > 0) {
          const shipTaxable = round2(shipping / 1.22);
          invoiceItems.push({
            description: 'Spedizione',
            quantity: 1,
            unit_price: shipping,
            vat_rate: 22,
            taxable_amount: shipTaxable,
            vat_amount: round2(shipping - shipTaxable),
            total_amount: shipping,
          });
        }
        const invoice = await db.Invoice.create({
          invoice_number: invoiceNumber,
          order_id: order.id,
          user_id: user ? user.id : null,
          issue_date: when.toISOString().slice(0, 10),
          seller_name: process.env.INVOICE_SELLER_NAME || 'celesterosa S.r.l.',
          seller_vat: process.env.INVOICE_SELLER_VAT || 'IT00000000000',
          seller_address: process.env.INVOICE_SELLER_ADDRESS || 'Via della Musica 1, Roma',
          customer_name: recipient,
          customer_vat: spec.billing_vat || null,
          customer_address: `${address?.line1 || 'Via Demo 1'}, ${address?.postal_code || '00100'} ${address?.city || 'Roma'}`,
          customer_email: spec.email,
          taxable_total: round2(invoiceItems.reduce((s, i) => s + i.taxable_amount, 0)),
          vat_total: round2(invoiceItems.reduce((s, i) => s + i.vat_amount, 0)),
          grand_total: round2(invoiceItems.reduce((s, i) => s + i.total_amount, 0)),
          currency: 'eur',
          status: 'issued',
        });
        for (const ii of invoiceItems) {
          await db.InvoiceItem.create({ ...ii, invoice_id: invoice.id });
        }
      }
    }
  },

  async down() {
    const nums = ORDERS.map((o) => o.num);
    const orders = await db.Order.findAll({ where: { order_number: nums } });
    const ids = orders.map((o) => o.id);
    if (ids.length) {
      const invoices = await db.Invoice.findAll({ where: { order_id: ids } });
      const invIds = invoices.map((i) => i.id);
      if (invIds.length) await db.InvoiceItem.destroy({ where: { invoice_id: invIds } });
      await db.Invoice.destroy({ where: { order_id: ids } });
      await db.Payment.destroy({ where: { order_id: ids } });
      await db.OrderItem.destroy({ where: { order_id: ids } });
      await db.Order.destroy({ where: { id: ids } });
    }
  },
};
