'use strict';

// Calcoli economici. Convenzione: i prezzi a catalogo sono IVA INCLUSA.
// Da ciascun importo lordo si scorpora imponibile e imposta.

const SHIPPING_FLAT = Number(process.env.SHIPPING_FLAT || 9.9);
const SHIPPING_FREE_THRESHOLD = Number(process.env.SHIPPING_FREE_THRESHOLD || 99);

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Scompone una riga: dal totale lordo (IVA incl.) ricava imponibile e IVA.
function computeLine(unitPriceInclVat, quantity, vatRate) {
  const lineTotal = round2(unitPriceInclVat * quantity);
  const taxable = round2(lineTotal / (1 + vatRate / 100));
  const vat = round2(lineTotal - taxable);
  return { line_total: lineTotal, line_taxable: taxable, line_vat: vat };
}

// Costo di spedizione in base al totale merce (lordo). Gratis sopra soglia.
function shippingFor(goodsTotal) {
  return goodsTotal >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FLAT;
}

// Aggrega le righe e aggiunge la spedizione.
function computeTotals(lines) {
  const subtotalTaxable = round2(lines.reduce((s, l) => s + l.line_taxable, 0));
  const vatTotal = round2(lines.reduce((s, l) => s + l.line_vat, 0));
  const goodsTotal = round2(lines.reduce((s, l) => s + l.line_total, 0));
  const shipping = shippingFor(goodsTotal);
  return {
    subtotal: subtotalTaxable,
    vat_total: vatTotal,
    shipping_total: shipping,
    grand_total: round2(goodsTotal + shipping),
  };
}

module.exports = { round2, computeLine, shippingFor, computeTotals };
