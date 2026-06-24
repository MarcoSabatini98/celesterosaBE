'use strict';

// Serializer ordine → DTO `Order` / `CheckoutResult` del frontend. Nesta gli
// indirizzi (colonne flat → oggetto), payment e invoice; converte DECIMAL e
// date.
const { mediaUrl } = require('../utils/media');

function num(value) {
  return value == null ? null : Number(value);
}

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function toOrderItem(item) {
  return {
    id: item.id,
    product_name: item.product_name,
    variant_name: item.variant_name ?? null,
    sku: item.sku,
    unit_price: num(item.unit_price),
    quantity: item.quantity,
    vat_rate: num(item.vat_rate),
    line_total: num(item.line_total),
  };
}

function toShipping(order) {
  return {
    recipient: order.shipping_recipient ?? null,
    line1: order.shipping_line1 ?? null,
    line2: order.shipping_line2 ?? null,
    city: order.shipping_city ?? null,
    province: order.shipping_province ?? null,
    postal_code: order.shipping_postal_code ?? null,
    country: order.shipping_country ?? null,
    phone: order.shipping_phone ?? null,
  };
}

function toPayment(payment) {
  if (!payment) return null;
  return {
    status: payment.status,
    provider: payment.provider,
    paid_at: iso(payment.paid_at),
  };
}

function toInvoice(invoice) {
  if (!invoice) return null;
  return {
    number: invoice.invoice_number,
    status: invoice.status,
    pdf_url: mediaUrl(invoice.pdf_key),
  };
}

function toOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    email: order.email,
    currency: order.currency,
    subtotal: num(order.subtotal),
    vat_total: num(order.vat_total),
    shipping_total: num(order.shipping_total),
    grand_total: num(order.grand_total),
    placed_at: iso(order.placed_at),
    paid_at: iso(order.paid_at),
    shipped_at: iso(order.shipped_at),
    delivered_at: iso(order.delivered_at),
    shipping: toShipping(order),
    items: (order.items || []).map(toOrderItem),
    payment: toPayment(order.payment),
    invoice: toInvoice(order.invoice),
  };
}

// Esito del checkout: ordine + dati del pagamento (sandbox simulato).
function toCheckoutResult(order, payment) {
  return {
    order: toOrder(order),
    payment: {
      client_secret: payment.client_secret,
      payment_intent_id: payment.payment_intent_id,
      simulated: payment.simulated,
      publishable_key: payment.publishable_key ?? null,
    },
  };
}

module.exports = { toOrder, toOrderItem, toCheckoutResult };
