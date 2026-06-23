'use strict';

const { round2, computeLine, shippingFor, computeTotals } = require('../../utils/pricing');

describe('pricing.round2', () => {
  it('arrotonda a 2 decimali', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.344)).toBe(2.34);
    expect(round2(10)).toBe(10);
  });
});

describe('pricing.computeLine (IVA scorporata dal lordo)', () => {
  it('scompone correttamente una riga IVA 22%', () => {
    const line = computeLine(749, 3, 22);
    expect(line.line_total).toBe(2247);
    expect(line.line_taxable).toBe(1841.8);
    expect(line.line_vat).toBe(405.2);
    expect(round2(line.line_taxable + line.line_vat)).toBe(line.line_total);
  });

  it('gestisce IVA 4%', () => {
    const line = computeLine(104, 1, 4);
    expect(line.line_total).toBe(104);
    expect(line.line_taxable).toBe(100);
    expect(line.line_vat).toBe(4);
  });
});

describe('pricing.shippingFor', () => {
  it('applica la spedizione sotto soglia e la azzera sopra', () => {
    expect(shippingFor(50)).toBeGreaterThan(0);
    expect(shippingFor(99)).toBe(0);
    expect(shippingFor(150)).toBe(0);
  });
});

describe('pricing.computeTotals', () => {
  it('aggrega righe e aggiunge la spedizione', () => {
    const lines = [computeLine(59, 1, 22)]; // 59€ < soglia → spedizione
    const totals = computeTotals(lines);
    expect(totals.grand_total).toBe(round2(59 + totals.shipping_total));
    expect(totals.shipping_total).toBeGreaterThan(0);
    expect(round2(totals.subtotal + totals.vat_total)).toBe(59);
  });

  it('spedizione gratis sopra soglia', () => {
    const lines = [computeLine(749, 1, 22)];
    const totals = computeTotals(lines);
    expect(totals.shipping_total).toBe(0);
    expect(totals.grand_total).toBe(749);
  });
});
