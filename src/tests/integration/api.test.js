'use strict';

// Integration test end-to-end sull'app Express (DB di test isolato).
// Coprono i flussi principali: auth, catalogo, carrello, checkout con
// pagamento simulato, ordini, fattura e backoffice admin.

const request = require('supertest');
const app = require('../../../app');
const db = require('../../models');
const { ensureBucket } = require('../../config/minio');

const sfx = Date.now();
const api = (path) => request(app).get(`/api/v1${path}`);
const post = (path) => request(app).post(`/api/v1${path}`);

let adminToken;
let customerToken;
let inStockSlug;
let inStockVariantId;

beforeAll(async () => {
  await db.sequelize.authenticate();
  // Bucket per i PDF fattura generati durante il checkout.
  await ensureBucket().catch(() => {});
});

afterAll(async () => {
  await db.sequelize.close();
});

describe('System', () => {
  it('GET /health → 200', async () => {
    const res = await api('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });
});

describe('Auth', () => {
  const email = `it.user.${sfx}@example.com`;

  it('registra un nuovo cliente', async () => {
    const res = await post('/auth/register').send({
      email,
      password: 'Secret123',
      first_name: 'Anna',
      last_name: 'Verdi',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('customer');
    expect(res.body.data.access_token).toBeTruthy();
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it('rifiuta credenziali errate (401)', async () => {
    const res = await post('/auth/login').send({ email, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('valida l’input di registrazione (400)', async () => {
    const res = await post('/auth/register').send({ email: 'bad', password: 'x' });
    expect(res.status).toBe(400);
  });

  it('login seed admin e customer', async () => {
    const a = await post('/auth/login').send({ email: 'admin@celesterosa.it', password: 'Admin123!' });
    expect(a.status).toBe(200);
    expect(a.body.data.user.role).toBe('admin');
    adminToken = a.body.data.access_token;

    const c = await post('/auth/login').send({ email: 'cliente@example.com', password: 'Cliente123!' });
    customerToken = c.body.data.access_token;
  });

  it('GET /auth/me con token', async () => {
    const res = await api('/auth/me').set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('cliente@example.com');
  });

  it('GET /auth/me senza token → 401', async () => {
    const res = await api('/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Catalogo', () => {
  it('GET /categories → albero', async () => {
    const res = await api('/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].children).toBeDefined();
  });

  it('GET /brands → elenco', async () => {
    const res = await api('/brands');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /products → paginato, e trova una variante disponibile', async () => {
    const res = await api('/products?limit=20');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThan(0);
    for (const item of res.body.data.items) {
      const detail = await api(`/products/${item.slug}`);
      // Variante con stock ampio: i test seguenti acquistano/aggiornano più volte.
      const variant = detail.body.data.variants.find((v) => v.stock >= 5);
      if (variant) {
        inStockSlug = item.slug;
        inStockVariantId = variant.id;
        break;
      }
    }
    expect(inStockVariantId).toBeTruthy();
  });

  it('GET /products con filtri e ricerca', async () => {
    const res = await api('/products?featured=true&sort=price_asc&page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(1);
  });

  it('GET /products/:slug → dettaglio', async () => {
    const res = await api(`/products/${inStockSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.variants.length).toBeGreaterThan(0);
  });

  it('GET /products/non-esiste → 404', async () => {
    const res = await api('/products/non-esiste-xyz');
    expect(res.status).toBe(404);
  });
});

describe('Carrello + Checkout guest', () => {
  let cartToken;

  it('aggiunge un articolo (guest) e riceve il token carrello', async () => {
    const res = await post('/cart/items').send({ variant_id: inStockVariantId, quantity: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.cart_token).toBeTruthy();
    expect(res.body.data.item_count).toBe(1);
    cartToken = res.body.data.cart_token;
  });

  it('checkout guest + pagamento simulato → ordine pagato con fattura', async () => {
    const chk = await post('/checkout')
      .set('X-Cart-Token', cartToken)
      .send({
        email: `guest.${sfx}@example.com`,
        shipping: { recipient: 'Guest', line1: 'Via Roma 1', city: 'Roma', postal_code: '00100', province: 'RM', country: 'IT' },
      });
    expect(chk.status).toBe(201);
    expect(chk.body.data.payment.simulated).toBe(true);
    const pi = chk.body.data.payment.payment_intent_id;

    const pay = await post('/stripe/simulate-payment').send({ payment_intent_id: pi });
    expect(pay.status).toBe(200);
    expect(pay.body.data.status).toBe('paid');
    expect(pay.body.data.invoice.number).toMatch(/^CEL\/\d{4}\/\d{4}$/);
  });
});

describe('Checkout autenticato + ordini + fattura', () => {
  let orderNumber;

  it('login customer, aggiunge e completa il checkout', async () => {
    await post('/cart/items').set('Authorization', `Bearer ${customerToken}`).send({ variant_id: inStockVariantId, quantity: 1 });
    const chk = await post('/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipping: { recipient: 'Mario Rossi', line1: 'Via Verdi 5', city: 'Milano', postal_code: '20100', province: 'MI', country: 'IT' } });
    expect(chk.status).toBe(201);
    orderNumber = chk.body.data.order.order_number;
    await post('/stripe/simulate-payment').send({ payment_intent_id: chk.body.data.payment.payment_intent_id });
  });

  it('GET /orders → contiene l’ordine pagato', async () => {
    const res = await api('/orders').set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it('GET /orders/:n/invoice → fattura disponibile', async () => {
    const res = await api(`/orders/${orderNumber}/invoice`).set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.invoice_number).toBeTruthy();
    expect(res.body.data.grand_total).toBeGreaterThan(0);
  });
});

describe('Admin', () => {
  let brandId;

  it('crea un brand (admin)', async () => {
    const res = await post('/admin/brands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `IntegBrand ${sfx}` });
    expect(res.status).toBe(201);
    brandId = res.body.data.id;
  });

  it('blocca i non-admin (403)', async () => {
    const res = await post('/admin/brands')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Hack' });
    expect(res.status).toBe(403);
  });

  it('lista ordini e fatture (admin) con paginazione', async () => {
    const orders = await api('/admin/orders?limit=5').set('Authorization', `Bearer ${adminToken}`);
    expect(orders.status).toBe(200);
    expect(orders.body.data.total).toBeGreaterThan(0);

    const invoices = await api('/admin/invoices?limit=5').set('Authorization', `Bearer ${adminToken}`);
    expect(invoices.status).toBe(200);
  });

  it('aggiorna lo stato di un ordine', async () => {
    const list = await api('/admin/orders?limit=1').set('Authorization', `Bearer ${adminToken}`);
    const num = list.body.data.items[0].order_number;
    const res = await request(app)
      .patch(`/api/v1/admin/orders/${num}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'shipped' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('shipped');
  });

  it('elimina il brand creato', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/brands/${brandId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Carrello: update, remove, merge', () => {
  it('aggiorna e rimuove un articolo', async () => {
    const add = await post('/cart/items').send({ variant_id: inStockVariantId, quantity: 1 });
    const token = add.body.data.cart_token;
    const itemId = add.body.data.items[0].item_id;

    const upd = await request(app)
      .put(`/api/v1/cart/items/${itemId}`)
      .set('X-Cart-Token', token)
      .send({ quantity: 2 });
    expect(upd.status).toBe(200);
    expect(upd.body.data.item_count).toBe(2);

    const del = await request(app).delete(`/api/v1/cart/items/${itemId}`).set('X-Cart-Token', token);
    expect(del.status).toBe(200);
    expect(del.body.data.item_count).toBe(0);
  });

  it('unisce il carrello guest a quello dell’utente al login', async () => {
    const guest = await post('/cart/items').send({ variant_id: inStockVariantId, quantity: 1 });
    const token = guest.body.data.cart_token;
    const merged = await post('/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('X-Cart-Token', token)
      .send({ variant_id: inStockVariantId, quantity: 1 });
    expect(merged.status).toBe(200);
    expect(merged.body.data.item_count).toBeGreaterThanOrEqual(2);
    await request(app).delete('/api/v1/cart').set('Authorization', `Bearer ${customerToken}`);
  });
});

describe('Catalogo: filtro per categoria (subtree)', () => {
  it('GET /products?category=<top> usa il sottoalbero', async () => {
    const cats = await api('/categories');
    const top = cats.body.data[0];
    const res = await api(`/products?category=${top.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it('GET /categories/:slug → attributi filtrabili', async () => {
    const cats = await api('/categories');
    const leaf = cats.body.data[0].children[0];
    const res = await api(`/categories/${leaf.slug}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.attributes)).toBe(true);
  });
});

describe('Admin: ciclo di vita prodotto + immagine', () => {
  // PNG 1x1 trasparente.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  let productId;
  let variantId;

  it('crea, aggiorna prodotto e imposta attributi', async () => {
    const cats = await api('/categories');
    const categoryId = cats.body.data[0].children[0].id;

    const create = await post('/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_id: categoryId, sku: `IT-PROD-${sfx}`, name: `Prodotto Integ ${sfx}`, base_price: 123.45, is_featured: true });
    expect(create.status).toBe(201);
    productId = create.body.data.id;

    const upd = await request(app)
      .put(`/api/v1/admin/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ base_price: 150 });
    expect(upd.status).toBe(200);
    expect(Number(upd.body.data.base_price)).toBe(150);

    // Attributo della categoria, se presente.
    const cat = await api(`/categories/${cats.body.data[0].children[0].slug}`);
    if (cat.body.data.attributes.length) {
      const attr = cat.body.data.attributes[0];
      const val = attr.data_type === 'number' ? 4 : attr.options ? attr.options[0] : 'test';
      const setRes = await request(app)
        .put(`/api/v1/admin/products/${productId}/attributes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ attributes: { [attr.code]: val } });
      expect(setRes.status).toBe(200);
    }
  });

  it('aggiunge una variante', async () => {
    const res = await post(`/admin/products/${productId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: `IT-VAR-${sfx}`, name: 'Nero', stock: 5, is_default: true });
    expect(res.status).toBe(201);
    variantId = res.body.data.id;
    expect(variantId).toBeTruthy();
  });

  it('carica un’immagine e la ritrova nel dettaglio pubblico', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/products/${productId}/images`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('images', png, { filename: 'px.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.data[0].object_key).toMatch(/\.png$/);
  });

  it('elimina il prodotto creato', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});
