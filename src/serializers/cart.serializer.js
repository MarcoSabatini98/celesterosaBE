'use strict';

// Serializer del carrello → DTO `Cart` del frontend. I prezzi sono IVA inclusa
// (lordi): da essi si scorpora l'imponibile e l'IVA per riga e totali. La
// spedizione è calcolata sul totale lordo.

const { mediaUrl } = require('../utils/media');
const { computeShipping } = require('../utils/shipping');

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Immagine della riga: prima immagine primaria della variante, altrimenti del
// prodotto, altrimenti null.
function itemImage(variant) {
  const product = variant.product;
  const pools = [variant.images || [], product?.images || []];
  for (const images of pools) {
    if (images.length) {
      const primary = images.find((img) => img.is_primary) || images[0];
      return mediaUrl(primary.object_key);
    }
  }
  return null;
}

function toCartItem(item) {
  const variant = item.variant;
  const product = variant.product;
  const unitPrice = Number(item.unit_price); // lordo, IVA inclusa
  const vatRate = Number(product.vat_rate);
  const quantity = item.quantity;

  const lineTotal = round2(unitPrice * quantity);
  const lineTaxable = round2(lineTotal / (1 + vatRate / 100));
  const lineVat = round2(lineTotal - lineTaxable);
  const stock = variant.stock ?? 0;

  return {
    item_id: item.id,
    variant_id: variant.id,
    product_name: product.name,
    product_slug: product.slug,
    variant_name: variant.name,
    sku: variant.sku,
    unit_price: unitPrice,
    quantity,
    vat_rate: vatRate,
    line_total: lineTotal,
    line_taxable: lineTaxable,
    line_vat: lineVat,
    stock,
    in_stock: stock > 0,
    image: itemImage(variant),
  };
}

// Carrello completo con totali. `token` = cart_token da esporre al client guest.
function toCart(cart) {
  const items = (cart?.items || []).map(toCartItem);

  const grossTotal = round2(items.reduce((sum, i) => sum + i.line_total, 0));
  const vatTotal = round2(items.reduce((sum, i) => sum + i.line_vat, 0));
  const subtotal = round2(grossTotal - vatTotal);
  const shippingTotal = round2(computeShipping(grossTotal));
  const grandTotal = round2(grossTotal + shippingTotal);

  return {
    cart_token: cart?.token ?? null,
    item_count: items.reduce((sum, i) => sum + i.quantity, 0),
    items,
    subtotal,
    vat_total: vatTotal,
    shipping_total: shippingTotal,
    grand_total: grandTotal,
  };
}

// Carrello vuoto (nessuna persistenza): usato quando il visitatore non ha
// ancora un carrello.
function emptyCart() {
  return {
    cart_token: null,
    item_count: 0,
    items: [],
    subtotal: 0,
    vat_total: 0,
    shipping_total: 0,
    grand_total: 0,
  };
}

module.exports = { toCart, emptyCart };
