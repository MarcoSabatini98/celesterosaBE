'use strict';

const { orderNumber, invoiceNumber } = require('../../utils/sequence');

describe('sequence.orderNumber', () => {
  it('rispetta il formato ORD-AAAAMMGG-XXXXXX', () => {
    expect(orderNumber()).toMatch(/^ORD-\d{8}-\d{6}$/);
  });

  it('genera valori diversi', () => {
    const a = orderNumber();
    const b = orderNumber();
    // Estremamente improbabile collidano (6 cifre random).
    expect(a).not.toBe(b);
  });
});

describe('sequence.invoiceNumber', () => {
  it('formatta PREFIX/AAAA/NNNN con padding', () => {
    expect(invoiceNumber('CEL', 2026, 1)).toBe('CEL/2026/0001');
    expect(invoiceNumber('CEL', 2026, 42)).toBe('CEL/2026/0042');
    expect(invoiceNumber('CEL', 2026, 1234)).toBe('CEL/2026/1234');
  });
});
