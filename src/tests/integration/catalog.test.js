// src/tests/integration/catalog.test.js
// Test end-to-end del catalogo pubblico su dati seed. Gli slug vengono letti
// dinamicamente dalle risposte per non dipendere dalla generazione esatta.

const request = require('supertest');
const app = require('../../../app');

const BASE = '/api/v1';

describe('Catalog API', () => {
  describe('GET /categories', () => {
    it('200 e albero categorie con figlie e image_url', async () => {
      const res = await request(app).get(`${BASE}/categories`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const top = res.body.data[0];
      expect(top).toHaveProperty('slug');
      expect(top).toHaveProperty('children');
      expect(Array.isArray(top.children)).toBe(true);
      // Le categorie seed non hanno immagini.
      expect(top.image_url).toBeNull();
    });
  });

  describe('GET /categories/:slug', () => {
    it('200 e dettaglio con attributi EAV definiti', async () => {
      const list = await request(app).get(`${BASE}/categories`);
      const child = list.body.data.flatMap((c) => c.children)[0];

      const res = await request(app).get(`${BASE}/categories/${child.slug}`);
      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe(child.slug);
      expect(Array.isArray(res.body.data.attributes)).toBe(true);
      if (res.body.data.attributes.length) {
        expect(res.body.data.attributes[0]).toHaveProperty('code');
        expect(res.body.data.attributes[0]).toHaveProperty('data_type');
      }
    });

    it('404 con slug inesistente', async () => {
      const res = await request(app).get(`${BASE}/categories/non-esiste-xyz`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /brands', () => {
    it('200 e elenco brand con logo_url', async () => {
      const res = await request(app).get(`${BASE}/brands`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.map((b) => b.name)).toContain('Fender');
      expect(res.body.data[0]).toHaveProperty('logo_url');
    });
  });

  describe('GET /products', () => {
    it('200 e pagina di prodotti con campi derivati', async () => {
      const res = await request(app).get(`${BASE}/products`);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ page: 1 });
      expect(res.body.data.total).toBeGreaterThan(0);
      expect(res.body.data.items.length).toBeGreaterThan(0);

      const card = res.body.data.items[0];
      expect(card).toHaveProperty('price_from');
      expect(card).toHaveProperty('total_stock');
      expect(card).toHaveProperty('primary_image'); // null nel seed
    });

    it('rispetta la paginazione (limit)', async () => {
      const res = await request(app).get(`${BASE}/products?limit=2&page=1`);
      expect(res.status).toBe(200);
      expect(res.body.data.limit).toBe(2);
      expect(res.body.data.items.length).toBeLessThanOrEqual(2);
    });

    it('filtra featured=true', async () => {
      const res = await request(app).get(`${BASE}/products?featured=true`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.every((p) => p.is_featured === true)).toBe(true);
    });

    it('filtra per ricerca testuale q', async () => {
      const res = await request(app).get(`${BASE}/products?q=Stratocaster`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.some((p) => /stratocaster/i.test(p.name))).toBe(true);
    });

    it('ordina per prezzo crescente', async () => {
      const res = await request(app).get(`${BASE}/products?sort=price_asc&limit=100`);
      const prices = res.body.data.items.map((p) => p.base_price);
      const sorted = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sorted);
    });

    it('filtra per categoria (slug)', async () => {
      const cats = await request(app).get(`${BASE}/categories`);
      const child = cats.body.data.flatMap((c) => c.children)[0];
      const res = await request(app).get(`${BASE}/products?category=${child.slug}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.every((p) => p.category.slug === child.slug)).toBe(true);
    });

    it('422 con condition non valida', async () => {
      const res = await request(app).get(`${BASE}/products?condition=rotto`);
      expect(res.status).toBe(422);
    });

    it('422 con min_price maggiore di max_price', async () => {
      const res = await request(app).get(`${BASE}/products?min_price=1000&max_price=10`);
      expect(res.status).toBe(422);
    });
  });

  describe('GET /products/:slug', () => {
    it('200 e dettaglio con varianti e attributi', async () => {
      const list = await request(app).get(`${BASE}/products?q=Stratocaster`);
      const slug = list.body.data.items[0].slug;

      const res = await request(app).get(`${BASE}/products/${slug}`);
      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe(slug);
      expect(Array.isArray(res.body.data.variants)).toBe(true);
      expect(res.body.data.variants.length).toBeGreaterThan(0);
      expect(res.body.data.variants[0]).toHaveProperty('in_stock');
      expect(Array.isArray(res.body.data.attributes)).toBe(true);
      expect(Array.isArray(res.body.data.images)).toBe(true);
    });

    it('404 con slug inesistente', async () => {
      const res = await request(app).get(`${BASE}/products/prodotto-fantasma`);
      expect(res.status).toBe(404);
    });
  });
});
