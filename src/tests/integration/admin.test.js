// src/tests/integration/admin.test.js
// Area admin: autorizzazione (ruolo), CRUD prodotti, attributi EAV, varianti,
// upload immagini (MinIO reale) e gestione ordini. Richiede MinIO attivo sulla
// 9000 per i test sulle immagini.

const request = require('supertest');
const app = require('../../../app');

const BASE = '/api/v1';
const ADMIN = { email: 'admin@celesterosa.it', password: 'Admin123!' };

// PNG 1x1 valido.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let adminToken;
let categoryId;
let categorySlug;

async function login(creds) {
  const res = await request(app).post(`${BASE}/auth/login`).send(creds);
  return res.body.data.access_token;
}

function auth(req) {
  return req.set('Authorization', `Bearer ${adminToken}`);
}

function uniqueSku(p = 'ADM') {
  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function createProduct(overrides = {}) {
  const res = await auth(request(app).post(`${BASE}/admin/products`)).send({
    category_id: categoryId,
    sku: uniqueSku(),
    name: 'Prodotto Test',
    base_price: 199.0,
    ...overrides,
  });
  return res;
}

beforeAll(async () => {
  adminToken = await login(ADMIN);
  const cats = await request(app).get(`${BASE}/categories`);
  const child = cats.body.data.flatMap((c) => c.children)[0];
  categoryId = child.id;
  categorySlug = child.slug;
});

describe('Admin API', () => {
  describe('Autorizzazione', () => {
    it('401 senza token', async () => {
      const res = await request(app).get(`${BASE}/admin/products`);
      expect(res.status).toBe(401);
    });

    it('403 per utente non admin', async () => {
      const email = `cust_${Date.now()}@test.it`;
      const reg = await request(app)
        .post(`${BASE}/auth/register`)
        .send({ email, password: 'Password123', first_name: 'C', last_name: 'U' });
      const res = await request(app)
        .get(`${BASE}/admin/products`)
        .set('Authorization', `Bearer ${reg.body.data.access_token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('CRUD prodotti', () => {
    it('crea, legge, aggiorna, elimina un prodotto', async () => {
      const created = await createProduct({ name: 'Chitarra Demo', base_price: 250 });
      expect(created.status).toBe(201);
      const id = created.body.data.id;
      expect(created.body.data.slug).toContain('chitarra-demo');

      const got = await auth(request(app).get(`${BASE}/admin/products/${id}`));
      expect(got.status).toBe(200);

      const updated = await auth(request(app).put(`${BASE}/admin/products/${id}`)).send({
        base_price: 275,
        is_featured: true,
      });
      expect(updated.status).toBe(200);
      expect(updated.body.data.base_price).toBe(275);
      expect(updated.body.data.is_featured).toBe(true);

      const del = await auth(request(app).delete(`${BASE}/admin/products/${id}`));
      expect(del.status).toBe(200);
      expect(del.body.data).toMatchObject({ deleted: true });

      const after = await auth(request(app).get(`${BASE}/admin/products/${id}`));
      expect(after.status).toBe(404);
    });

    it('409 con SKU duplicato', async () => {
      const sku = uniqueSku();
      await createProduct({ sku });
      const dup = await createProduct({ sku });
      expect(dup.status).toBe(409);
    });

    it('422 senza campi obbligatori', async () => {
      const res = await auth(request(app).post(`${BASE}/admin/products`)).send({ name: 'X' });
      expect(res.status).toBe(422);
    });

    it('lista paginata con ricerca', async () => {
      await createProduct({ name: 'CercaMe Speciale' });
      const res = await auth(request(app).get(`${BASE}/admin/products?q=CercaMe&limit=10`));
      expect(res.status).toBe(200);
      expect(res.body.data.items.some((p) => /CercaMe/.test(p.name))).toBe(true);
    });
  });

  describe('Attributi EAV e varianti', () => {
    it('imposta gli attributi del prodotto', async () => {
      const created = await createProduct();
      const id = created.body.data.id;

      const catDetail = await request(app).get(`${BASE}/categories/${categorySlug}`);
      const def = catDetail.body.data.attributes[0];
      const value = def.data_type === 'number' ? 6 : def.data_type === 'boolean' ? true : 'TestVal';

      const res = await auth(request(app).put(`${BASE}/admin/products/${id}/attributes`)).send({
        attributes: { [def.code]: value },
      });
      expect(res.status).toBe(200);
      expect(res.body.data.attributes.some((a) => a.code === def.code)).toBe(true);
    });

    it('aggiunge e rimuove una variante', async () => {
      const created = await createProduct();
      const id = created.body.data.id;

      const add = await auth(request(app).post(`${BASE}/admin/products/${id}/variants`)).send({
        sku: uniqueSku('VAR'),
        name: 'Rossa',
        color: 'Rosso',
        stock: 5,
        is_default: true,
      });
      expect(add.status).toBe(201);
      expect(add.body.data.variants.length).toBe(1);
      const variantId = add.body.data.variants[0].id;

      const del = await auth(request(app).delete(`${BASE}/admin/variants/${variantId}`));
      expect(del.status).toBe(200);
      expect(del.body.data.variants.length).toBe(0);
    });
  });

  describe('Immagini (MinIO)', () => {
    it('carica e rimuove un\'immagine prodotto', async () => {
      const created = await createProduct();
      const id = created.body.data.id;

      const up = await auth(request(app).post(`${BASE}/admin/products/${id}/images`)).attach(
        'images',
        PNG_1x1,
        { filename: 'test.png', contentType: 'image/png' },
      );
      expect(up.status).toBe(201);
      expect(up.body.data.images.length).toBe(1);
      expect(up.body.data.primary_image.url).toMatch(/^http.*\.png$/);
      const imageId = up.body.data.images[0].id;

      const del = await auth(request(app).delete(`${BASE}/admin/images/${imageId}`));
      expect(del.status).toBe(200);
      expect(del.body.data.images.length).toBe(0);
    });

    it('422 caricando un tipo file non immagine', async () => {
      const created = await createProduct();
      const id = created.body.data.id;
      const res = await auth(request(app).post(`${BASE}/admin/products/${id}/images`)).attach(
        'images',
        Buffer.from('non-immagine'),
        { filename: 'x.txt', contentType: 'text/plain' },
      );
      expect(res.status).toBe(422);
    });
  });

  describe('Gestione ordini', () => {
    async function placeAndPay() {
      const list = await request(app).get(`${BASE}/products?q=SM58`);
      const detail = await request(app).get(`${BASE}/products/${list.body.data.items[0].slug}`);
      const variantId = detail.body.data.variants[0].id;

      const cart = await request(app)
        .post(`${BASE}/cart/items`)
        .send({ variant_id: variantId, quantity: 1 });
      const token = cart.body.data.cart_token;

      const co = await request(app)
        .post(`${BASE}/checkout`)
        .set('X-Cart-Token', token)
        .send({
          email: 'guest@test.it',
          shipping: { recipient: 'G', line1: 'Via 1', city: 'Roma', postal_code: '00100', country: 'IT' },
        });
      await request(app)
        .post(`${BASE}/stripe/simulate-payment`)
        .send({ payment_intent_id: co.body.data.payment.payment_intent_id });
      return co.body.data.order.order_number;
    }

    it('lista tutti gli ordini', async () => {
      await placeAndPay();
      const res = await auth(request(app).get(`${BASE}/admin/orders`));
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });

    it('aggiorna lo stato di un ordine (con timestamp)', async () => {
      const orderNumber = await placeAndPay();
      const res = await auth(
        request(app).patch(`${BASE}/admin/orders/${orderNumber}/status`),
      ).send({ status: 'shipped' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('shipped');
      expect(res.body.data.shipped_at).toBeTruthy();
    });

    it('422 con stato non valido', async () => {
      const orderNumber = await placeAndPay();
      const res = await auth(
        request(app).patch(`${BASE}/admin/orders/${orderNumber}/status`),
      ).send({ status: 'teletrasportato' });
      expect(res.status).toBe(422);
    });
  });
});
