// src/tests/integration/orders.test.js
// Area ordini cliente: acquisto autenticato → lista, dettaglio, fattura.
// Scoping per utente ed errori. In test l'upload PDF su MinIO è saltato
// (pdf_url null), si verificano i metadati fattura.

const request = require('supertest');
const app = require('../../../app');

const BASE = '/api/v1';

const SHIPPING = {
  recipient: 'Mario Rossi',
  line1: 'Via Roma 1',
  city: 'Roma',
  province: 'RM',
  postal_code: '00100',
  country: 'IT',
};

async function registerUser() {
  const email = `buyer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.it`;
  const res = await request(app)
    .post(`${BASE}/auth/register`)
    .send({ email, password: 'Password123', first_name: 'Buyer', last_name: 'Test' });
  return res.body.data.access_token;
}

async function firstVariantId(q) {
  const list = await request(app).get(`${BASE}/products?q=${encodeURIComponent(q)}`);
  const detail = await request(app).get(`${BASE}/products/${list.body.data.items[0].slug}`);
  return detail.body.data.variants[0].id;
}

// Crea un ordine per l'utente; se pay=true lo porta a pagato.
async function placeOrder(access, { pay = true } = {}) {
  const variantId = await firstVariantId('SM58');
  await request(app)
    .post(`${BASE}/cart/items`)
    .set('Authorization', `Bearer ${access}`)
    .send({ variant_id: variantId, quantity: 1 });

  const co = await request(app)
    .post(`${BASE}/checkout`)
    .set('Authorization', `Bearer ${access}`)
    .send({ shipping: SHIPPING });

  const orderNumber = co.body.data.order.order_number;
  if (pay) {
    await request(app)
      .post(`${BASE}/stripe/simulate-payment`)
      .send({ payment_intent_id: co.body.data.payment.payment_intent_id });
  }
  return orderNumber;
}

describe('Orders API', () => {
  describe('GET /orders', () => {
    it('401 senza autenticazione', async () => {
      const res = await request(app).get(`${BASE}/orders`);
      expect(res.status).toBe(401);
    });

    it('200 e lista paginata degli ordini dell\'utente', async () => {
      const access = await registerUser();
      await placeOrder(access);

      const res = await request(app).get(`${BASE}/orders`).set('Authorization', `Bearer ${access}`);
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0]).toHaveProperty('order_number');
      expect(res.body.data.items[0].status).toBe('paid');
    });
  });

  describe('GET /orders/:orderNumber', () => {
    it('200 col dettaglio del proprio ordine', async () => {
      const access = await registerUser();
      const orderNumber = await placeOrder(access);

      const res = await request(app)
        .get(`${BASE}/orders/${orderNumber}`)
        .set('Authorization', `Bearer ${access}`);
      expect(res.status).toBe(200);
      expect(res.body.data.order_number).toBe(orderNumber);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.payment).toMatchObject({ status: 'succeeded' });
    });

    it('404 per l\'ordine di un altro utente (scoping)', async () => {
      const accessA = await registerUser();
      const orderNumber = await placeOrder(accessA);

      const accessB = await registerUser();
      const res = await request(app)
        .get(`${BASE}/orders/${orderNumber}`)
        .set('Authorization', `Bearer ${accessB}`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /orders/:orderNumber/invoice', () => {
    it('200 e metadati fattura per ordine pagato', async () => {
      const access = await registerUser();
      const orderNumber = await placeOrder(access);

      const res = await request(app)
        .get(`${BASE}/orders/${orderNumber}/invoice`)
        .set('Authorization', `Bearer ${access}`);
      expect(res.status).toBe(200);
      expect(res.body.data.invoice_number).toMatch(/\/\d{4}\//);
      expect(res.body.data.status).toBe('issued');
      expect(res.body.data).toHaveProperty('pdf_url'); // null in test (no MinIO)
    });

    it('è idempotente: stesso numero fattura su più chiamate', async () => {
      const access = await registerUser();
      const orderNumber = await placeOrder(access);

      const first = await request(app)
        .get(`${BASE}/orders/${orderNumber}/invoice`)
        .set('Authorization', `Bearer ${access}`);
      const second = await request(app)
        .get(`${BASE}/orders/${orderNumber}/invoice`)
        .set('Authorization', `Bearer ${access}`);
      expect(second.body.data.invoice_number).toBe(first.body.data.invoice_number);
    });

    it('422 se l\'ordine non è ancora pagato', async () => {
      const access = await registerUser();
      const orderNumber = await placeOrder(access, { pay: false });

      const res = await request(app)
        .get(`${BASE}/orders/${orderNumber}/invoice`)
        .set('Authorization', `Bearer ${access}`);
      expect(res.status).toBe(422);
    });
  });
});
