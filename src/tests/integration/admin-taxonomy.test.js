// src/tests/integration/admin-taxonomy.test.js
// Gestione admin di marche e categorie: CRUD, logo/immagine (MinIO) e blocco
// eliminazione quando in uso.

const request = require('supertest');
const app = require('../../../app');

const BASE = '/api/v1';
const ADMIN = { email: 'admin@celesterosa.it', password: 'Admin123!' };

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let token;
const auth = (req) => req.set('Authorization', `Bearer ${token}`);
const uniqueName = (p) => `${p} ${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

beforeAll(async () => {
  const res = await request(app).post(`${BASE}/auth/login`).send(ADMIN);
  token = res.body.data.access_token;
});

describe('Admin taxonomy API', () => {
  describe('Autorizzazione', () => {
    it('401 senza token', async () => {
      expect((await request(app).get(`${BASE}/admin/brands`)).status).toBe(401);
    });
  });

  describe('Marche', () => {
    it('crea, elenca, aggiorna ed elimina una marca', async () => {
      const created = await auth(request(app).post(`${BASE}/admin/brands`)).send({
        name: uniqueName('Marca'),
        website: 'https://example.com',
      });
      expect(created.status).toBe(201);
      expect(created.body.data.slug).toBeTruthy();
      const id = created.body.data.id;

      const list = await auth(request(app).get(`${BASE}/admin/brands`));
      expect(list.body.data.some((b) => b.id === id)).toBe(true);
      expect(list.body.data[0]).toHaveProperty('product_count');

      const upd = await auth(request(app).put(`${BASE}/admin/brands/${id}`)).send({
        is_active: false,
      });
      expect(upd.status).toBe(200);
      expect(upd.body.data.is_active).toBe(false);

      const del = await auth(request(app).delete(`${BASE}/admin/brands/${id}`));
      expect(del.status).toBe(200);
      expect(del.body.data).toMatchObject({ deleted: true });
    });

    it('422 senza nome', async () => {
      const res = await auth(request(app).post(`${BASE}/admin/brands`)).send({ website: 'x' });
      expect(res.status).toBe(422);
    });

    it('409 eliminando una marca con prodotti', async () => {
      const brands = await auth(request(app).get(`${BASE}/admin/brands`));
      const used = brands.body.data.find((b) => b.product_count > 0);
      const res = await auth(request(app).delete(`${BASE}/admin/brands/${used.id}`));
      expect(res.status).toBe(409);
    });

    it('carica un logo su MinIO', async () => {
      const created = await auth(request(app).post(`${BASE}/admin/brands`)).send({
        name: uniqueName('LogoBrand'),
      });
      const id = created.body.data.id;
      const up = await auth(request(app).post(`${BASE}/admin/brands/${id}/logo`)).attach(
        'logo',
        PNG_1x1,
        { filename: 'logo.png', contentType: 'image/png' },
      );
      expect(up.status).toBe(200);
      expect(up.body.data.logo_url).toMatch(/^http.*\.png$/);
    });
  });

  describe('Categorie', () => {
    it('crea categoria + sottocategoria, aggiorna ed elimina', async () => {
      const parent = await auth(request(app).post(`${BASE}/admin/categories`)).send({
        name: uniqueName('Reparto'),
      });
      expect(parent.status).toBe(201);
      const parentId = parent.body.data.id;

      const child = await auth(request(app).post(`${BASE}/admin/categories`)).send({
        name: uniqueName('Sottocategoria'),
        parent_id: parentId,
      });
      expect(child.status).toBe(201);
      expect(child.body.data.parent_id).toBe(parentId);

      const list = await auth(request(app).get(`${BASE}/admin/categories`));
      const found = list.body.data.find((c) => c.id === parentId);
      expect(found.children.some((c) => c.id === child.body.data.id)).toBe(true);

      // Padre con figlie → 409
      const delParent = await auth(request(app).delete(`${BASE}/admin/categories/${parentId}`));
      expect(delParent.status).toBe(409);

      // Elimina figlia (vuota) → ok, poi padre → ok
      expect((await auth(request(app).delete(`${BASE}/admin/categories/${child.body.data.id}`))).status).toBe(200);
      expect((await auth(request(app).delete(`${BASE}/admin/categories/${parentId}`))).status).toBe(200);
    });

    it('409 eliminando una categoria con prodotti', async () => {
      const list = await auth(request(app).get(`${BASE}/admin/categories`));
      const withProducts = list.body.data
        .flatMap((c) => c.children)
        .find((c) => c.product_count > 0);
      const res = await auth(request(app).delete(`${BASE}/admin/categories/${withProducts.id}`));
      expect(res.status).toBe(409);
    });

    it('carica un\'immagine categoria su MinIO', async () => {
      const created = await auth(request(app).post(`${BASE}/admin/categories`)).send({
        name: uniqueName('ImgCat'),
      });
      const id = created.body.data.id;
      const up = await auth(request(app).post(`${BASE}/admin/categories/${id}/image`)).attach(
        'image',
        PNG_1x1,
        { filename: 'cat.png', contentType: 'image/png' },
      );
      expect(up.status).toBe(200);
      expect(up.body.data.image_url).toMatch(/^http.*\.png$/);
    });
  });
});
