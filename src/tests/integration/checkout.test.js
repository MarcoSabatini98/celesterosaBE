// src/tests/integration/checkout.test.js
// Test end-to-end del checkout sandbox: carrello → ordine pending → pagamento
// simulato → ordine paid, con scalo stock e idempotenza.

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
  phone: '3331234567',
};

async function productByQuery(q) {
  const list = await request(app).get(`${BASE}/products?q=${encodeURIComponent(q)}`);
  const slug = list.body.data.items[0].slug;
  const detail = await request(app).get(`${BASE}/products/${slug}`);
  return detail.body.data;
}

// Crea un carrello guest con una riga e ne restituisce token + contesto.
async function guestCartWith(q, quantity = 1) {
  const product = await productByQuery(q);
  const variant = product.variants[0];
  const res = await request(app)
    .post(`${BASE}/cart/items`)
    .send({ variant_id: variant.id, quantity });
  return { token: res.body.data.cart_token, product, variant, cart: res.body.data };
}

describe('Checkout API', () => {
  describe('POST /checkout', () => {
    it('201 e CheckoutResult con ordine pending e payment intent simulato', async () => {
      const { token, cart } = await guestCartWith('DS-1', 2);

      const res = await request(app)
        .post(`${BASE}/checkout`)
        .set('X-Cart-Token', token)
        .send({ email: 'guest@test.it', shipping: SHIPPING });

      expect(res.status).toBe(201);
      expect(res.body.data.order).toMatchObject({ status: 'pending', email: 'guest@test.it' });
      expect(res.body.data.order.order_number).toMatch(/^CEL-/);
      expect(res.body.data.order.grand_total).toBe(cart.grand_total);
      expect(res.body.data.order.items).toHaveLength(1);
      expect(res.body.data.order.shipping).toMatchObject({ city: 'Roma', postal_code: '00100' });
      expect(res.body.data.payment).toMatchObject({ simulated: true });
      expect(res.body.data.payment.payment_intent_id).toMatch(/^pi_sim_/);
    });

    it('converte il carrello (GET /cart torna vuoto dopo il checkout)', async () => {
      const { token } = await guestCartWith('DS-1', 1);
      await request(app)
        .post(`${BASE}/checkout`)
        .set('X-Cart-Token', token)
        .send({ email: 'guest@test.it', shipping: SHIPPING });

      const cart = await request(app).get(`${BASE}/cart`).set('X-Cart-Token', token);
      expect(cart.body.data.item_count).toBe(0);
    });

    it('422 con carrello vuoto (nessun token/utente)', async () => {
      const res = await request(app).post(`${BASE}/checkout`).send({ email: 'x@test.it', shipping: SHIPPING });
      expect(res.status).toBe(422);
    });

    it('422 guest senza email', async () => {
      const { token } = await guestCartWith('DS-1', 1);
      const res = await request(app)
        .post(`${BASE}/checkout`)
        .set('X-Cart-Token', token)
        .send({ shipping: SHIPPING });
      expect(res.status).toBe(422);
    });

    it('422 senza indirizzo di spedizione', async () => {
      const { token } = await guestCartWith('DS-1', 1);
      const res = await request(app)
        .post(`${BASE}/checkout`)
        .set('X-Cart-Token', token)
        .send({ email: 'guest@test.it' });
      expect(res.status).toBe(422);
    });

    it('422 con same_billing=false ma senza indirizzo di fatturazione', async () => {
      const { token } = await guestCartWith('DS-1', 1);
      const res = await request(app)
        .post(`${BASE}/checkout`)
        .set('X-Cart-Token', token)
        .send({ email: 'guest@test.it', shipping: SHIPPING, same_billing: false });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /stripe/simulate-payment', () => {
    async function placeOrder(q, quantity) {
      const { token, product, variant } = await guestCartWith(q, quantity);
      const res = await request(app)
        .post(`${BASE}/checkout`)
        .set('X-Cart-Token', token)
        .send({ email: 'guest@test.it', shipping: SHIPPING });
      return { paymentIntentId: res.body.data.payment.payment_intent_id, product, variant };
    }

    it('200 e ordine paid con pagamento succeeded', async () => {
      const { paymentIntentId } = await placeOrder('SM58', 1);
      const res = await request(app)
        .post(`${BASE}/stripe/simulate-payment`)
        .send({ payment_intent_id: paymentIntentId });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('paid');
      expect(res.body.data.paid_at).toBeTruthy();
      expect(res.body.data.payment).toMatchObject({ status: 'succeeded', provider: 'stripe' });
    });

    it('scala lo stock della variante', async () => {
      const { paymentIntentId, product, variant } = await placeOrder('FG800', 3);
      const before = (await request(app).get(`${BASE}/products/${product.slug}`)).body.data.variants.find(
        (v) => v.id === variant.id,
      ).stock;

      await request(app).post(`${BASE}/stripe/simulate-payment`).send({ payment_intent_id: paymentIntentId });

      const after = (await request(app).get(`${BASE}/products/${product.slug}`)).body.data.variants.find(
        (v) => v.id === variant.id,
      ).stock;
      expect(after).toBe(before - 3);
    });

    it('è idempotente (seconda chiamata resta paid)', async () => {
      const { paymentIntentId } = await placeOrder('SM58', 1);
      await request(app).post(`${BASE}/stripe/simulate-payment`).send({ payment_intent_id: paymentIntentId });
      const res = await request(app)
        .post(`${BASE}/stripe/simulate-payment`)
        .send({ payment_intent_id: paymentIntentId });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('paid');
    });

    it('404 con payment_intent_id inesistente', async () => {
      const res = await request(app)
        .post(`${BASE}/stripe/simulate-payment`)
        .send({ payment_intent_id: 'pi_sim_nope' });
      expect(res.status).toBe(404);
    });

    it('422 senza payment_intent_id', async () => {
      const res = await request(app).post(`${BASE}/stripe/simulate-payment`).send({});
      expect(res.status).toBe(422);
    });
  });

  describe('Checkout utente autenticato', () => {
    it('usa l\'email dell\'utente senza richiederla nel payload', async () => {
      const login = await request(app)
        .post(`${BASE}/auth/login`)
        .send({ email: 'admin@celesterosa.it', password: 'Admin123!' });
      const access = login.body.data.access_token;

      const product = await productByQuery('DS-1');
      await request(app)
        .post(`${BASE}/cart/items`)
        .set('Authorization', `Bearer ${access}`)
        .send({ variant_id: product.variants[0].id, quantity: 1 });

      const res = await request(app)
        .post(`${BASE}/checkout`)
        .set('Authorization', `Bearer ${access}`)
        .send({ shipping: SHIPPING });

      expect(res.status).toBe(201);
      expect(res.body.data.order.email).toBe('admin@celesterosa.it');
    });
  });
});
