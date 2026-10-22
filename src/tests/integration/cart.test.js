// src/tests/integration/cart.test.js
// Test end-to-end del carrello: guest (X-Cart-Token) e utente, calcolo totali,
// regola spedizione (gratis >= 99, altrimenti 9.90), controllo stock.

const request = require('supertest');
const app = require('../../../app');

const BASE = '/api/v1';

// Recupera la prima variante (+ dettaglio prodotto) cercando per testo.
async function findVariant(q) {
  const list = await request(app).get(`${BASE}/products?q=${encodeURIComponent(q)}`);
  const slug = list.body.data.items[0].slug;
  const detail = await request(app).get(`${BASE}/products/${slug}`);
  return detail.body.data;
}

describe('Cart API', () => {
  describe('GET /cart', () => {
    it('200 e carrello vuoto senza token né utente', async () => {
      const res = await request(app).get(`${BASE}/cart`);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ cart_token: null, item_count: 0, grand_total: 0 });
      expect(res.body.data.items).toHaveLength(0);
    });

    // Token scaduto/non valido: 401 (il client fa refresh e riprova), non
    // degrado silenzioso a guest che mostrerebbe un carrello vuoto.
    it('401 con Bearer non valido', async () => {
      const res = await request(app).get(`${BASE}/cart`).set('Authorization', 'Bearer non.valido');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /cart/items (guest)', () => {
    it('crea il carrello, restituisce cart_token e calcola i totali', async () => {
      const product = await findVariant('DS-1'); // pedale, base 59 → spedizione 9.90
      const variant = product.variants[0];

      const res = await request(app)
        .post(`${BASE}/cart/items`)
        .send({ variant_id: variant.id, quantity: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.cart_token).toBeTruthy();
      expect(res.body.data.item_count).toBe(1);
      expect(res.body.data.items[0]).toMatchObject({
        variant_id: variant.id,
        quantity: 1,
        product_slug: product.slug,
      });
      // 59 < soglia 99 → spedizione fissa.
      expect(res.body.data.shipping_total).toBe(9.9);
      expect(res.body.data.grand_total).toBe(
        Number((res.body.data.subtotal + res.body.data.vat_total + 9.9).toFixed(2)),
      );
    });

    it('spedizione gratis sopra la soglia (>= 99)', async () => {
      const product = await findVariant('SM58'); // microfono, base 119
      const variant = product.variants[0];

      const res = await request(app)
        .post(`${BASE}/cart/items`)
        .send({ variant_id: variant.id, quantity: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.shipping_total).toBe(0);
    });

    it('persiste tra richieste con X-Cart-Token e somma le quantità', async () => {
      const product = await findVariant('DS-1');
      const variant = product.variants[0];

      const first = await request(app)
        .post(`${BASE}/cart/items`)
        .send({ variant_id: variant.id, quantity: 1 });
      const token = first.body.data.cart_token;

      const second = await request(app)
        .post(`${BASE}/cart/items`)
        .set('X-Cart-Token', token)
        .send({ variant_id: variant.id, quantity: 2 });

      expect(second.body.data.cart_token).toBe(token);
      expect(second.body.data.items).toHaveLength(1);
      expect(second.body.data.item_count).toBe(3);

      const get = await request(app).get(`${BASE}/cart`).set('X-Cart-Token', token);
      expect(get.body.data.item_count).toBe(3);
    });

    it('404 con variante inesistente', async () => {
      const res = await request(app)
        .post(`${BASE}/cart/items`)
        .send({ variant_id: 999999, quantity: 1 });
      expect(res.status).toBe(404);
    });

    it('422 senza variant_id', async () => {
      const res = await request(app).post(`${BASE}/cart/items`).send({ quantity: 1 });
      expect(res.status).toBe(422);
    });

    it('422 con quantità superiore allo stock', async () => {
      const product = await findVariant('DS-1');
      const variant = product.variants[0];
      const res = await request(app)
        .post(`${BASE}/cart/items`)
        .send({ variant_id: variant.id, quantity: variant.stock + 1 });
      expect(res.status).toBe(422);
    });
  });

  describe('PUT/DELETE /cart/items', () => {
    async function seededCart() {
      const product = await findVariant('DS-1');
      const variant = product.variants[0];
      const res = await request(app)
        .post(`${BASE}/cart/items`)
        .send({ variant_id: variant.id, quantity: 2 });
      return { token: res.body.data.cart_token, itemId: res.body.data.items[0].item_id };
    }

    it('aggiorna la quantità', async () => {
      const { token, itemId } = await seededCart();
      const res = await request(app)
        .put(`${BASE}/cart/items/${itemId}`)
        .set('X-Cart-Token', token)
        .send({ quantity: 1 });
      expect(res.status).toBe(200);
      expect(res.body.data.item_count).toBe(1);
    });

    it('422 aggiornando oltre lo stock', async () => {
      const { token, itemId } = await seededCart();
      const res = await request(app)
        .put(`${BASE}/cart/items/${itemId}`)
        .set('X-Cart-Token', token)
        .send({ quantity: 999 });
      expect(res.status).toBe(422);
    });

    it('rimuove la riga', async () => {
      const { token, itemId } = await seededCart();
      const res = await request(app)
        .delete(`${BASE}/cart/items/${itemId}`)
        .set('X-Cart-Token', token);
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
      expect(res.body.data.shipping_total).toBe(0);
    });

    it('svuota il carrello', async () => {
      const { token } = await seededCart();
      const res = await request(app).delete(`${BASE}/cart`).set('X-Cart-Token', token);
      expect(res.status).toBe(200);
      expect(res.body.data.item_count).toBe(0);
    });
  });

  describe('Carrello utente autenticato', () => {
    async function loginAdmin() {
      const res = await request(app)
        .post(`${BASE}/auth/login`)
        .send({ email: 'admin@celesterosa.it', password: 'Admin123!' });
      return res.body.data.access_token;
    }

    it('lega il carrello all\'utente (recuperabile col Bearer)', async () => {
      const token = await loginAdmin();
      const product = await findVariant('DS-1');
      const variant = product.variants[0];

      const add = await request(app)
        .post(`${BASE}/cart/items`)
        .set('Authorization', `Bearer ${token}`)
        .send({ variant_id: variant.id, quantity: 1 });
      expect(add.status).toBe(200);

      const get = await request(app).get(`${BASE}/cart`).set('Authorization', `Bearer ${token}`);
      expect(get.body.data.item_count).toBe(1);
    });
  });
});
