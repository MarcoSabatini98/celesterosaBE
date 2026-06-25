// src/tests/unit/cors.test.js
// Il preflight CORS deve consentire l'header custom X-Cart-Token (inviato dal
// FE per il carrello guest). Senza, browser blocca cart/checkout/logout.

const request = require('supertest');
const app = require('../../../app');

describe('CORS preflight', () => {
  it('consente X-Cart-Token tra gli allowed headers', async () => {
    const res = await request(app)
      .options('/api/v1/cart')
      .set('Origin', 'http://localhost:4200')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'x-cart-token');

    const allow = (res.headers['access-control-allow-headers'] || '').toLowerCase();
    expect(allow).toContain('x-cart-token');
  });
});
