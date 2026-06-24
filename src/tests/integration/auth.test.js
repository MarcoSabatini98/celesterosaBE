// src/tests/integration/auth.test.js
// Test end-to-end del modulo auth. Contratto celesterosa: i token viaggiano nel
// body (snake_case access_token / refresh_token), non nei cookie. I payload non
// validi tornano 422 (AppError.unprocessable dal middleware validate).

const request = require('supertest');
const app = require('../../../app');

const BASE = '/api/v1/auth';

// Credenziali admin dal seeder (database/seeders/...-users.js).
const ADMIN_EMAIL = 'admin@celesterosa.it';
const ADMIN_PASSWORD = 'Admin123!';

function registerPayload(overrides = {}) {
  return {
    email: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.it`,
    password: 'Password123',
    first_name: 'Mario',
    last_name: 'Rossi',
    phone: '3331234567',
    ...overrides,
  };
}

describe('Auth API', () => {
  describe('POST /auth/register', () => {
    it('201 e AuthResult (utente senza password + token) con dati validi', async () => {
      const res = await request(app).post(`${BASE}/register`).send(registerPayload());

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('access_token');
      expect(res.body.data).toHaveProperty('refresh_token');
      expect(res.body.data.user).toMatchObject({ role: 'customer', is_active: true });
      expect(res.body.data.user).not.toHaveProperty('password_hash');
    });

    it('422 con email non valida', async () => {
      const res = await request(app)
        .post(`${BASE}/register`)
        .send(registerPayload({ email: 'non-email' }));
      expect(res.status).toBe(422);
    });

    it('422 con password troppo corta', async () => {
      const res = await request(app)
        .post(`${BASE}/register`)
        .send(registerPayload({ password: 'short' }));
      expect(res.status).toBe(422);
    });

    it('409 con email già registrata', async () => {
      const payload = registerPayload();
      await request(app).post(`${BASE}/register`).send(payload);
      const res = await request(app).post(`${BASE}/register`).send(payload);
      expect(res.status).toBe(409);
    });
  });

  describe('POST /auth/login', () => {
    it('200 con credenziali admin del seed', async () => {
      const res = await request(app)
        .post(`${BASE}/login`)
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('access_token');
      expect(res.body.data.user).toMatchObject({ email: ADMIN_EMAIL, role: 'admin' });
    });

    it('401 con password errata', async () => {
      const res = await request(app)
        .post(`${BASE}/login`)
        .send({ email: ADMIN_EMAIL, password: 'sbagliata' });
      expect(res.status).toBe(401);
    });

    it('401 con utente inesistente', async () => {
      const res = await request(app)
        .post(`${BASE}/login`)
        .send({ email: 'nessuno@test.it', password: 'whatever' });
      expect(res.status).toBe(401);
    });

    it('422 se manca la password', async () => {
      const res = await request(app).post(`${BASE}/login`).send({ email: ADMIN_EMAIL });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /auth/me', () => {
    it('200 con il profilo dell\'utente autenticato', async () => {
      const reg = await request(app).post(`${BASE}/register`).send(registerPayload());
      const token = reg.body.data.access_token;

      const res = await request(app).get(`${BASE}/me`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ email: reg.body.data.user.email });
      expect(res.body.data).not.toHaveProperty('password_hash');
    });

    it('401 senza token', async () => {
      const res = await request(app).get(`${BASE}/me`);
      expect(res.status).toBe(401);
    });

    it('401 con token malformato', async () => {
      const res = await request(app).get(`${BASE}/me`).set('Authorization', 'Bearer non-valido');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('200 e nuova coppia di token con refresh valido', async () => {
      const reg = await request(app).post(`${BASE}/register`).send(registerPayload());
      const refreshToken = reg.body.data.refresh_token;

      const res = await request(app).post(`${BASE}/refresh`).send({ refresh_token: refreshToken });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('access_token');
      expect(res.body.data).toHaveProperty('refresh_token');
    });

    it('401 riusando un refresh già ruotato (rotazione + revoca)', async () => {
      const reg = await request(app).post(`${BASE}/register`).send(registerPayload());
      const refreshToken = reg.body.data.refresh_token;

      await request(app).post(`${BASE}/refresh`).send({ refresh_token: refreshToken });
      const reuse = await request(app)
        .post(`${BASE}/refresh`)
        .send({ refresh_token: refreshToken });
      expect(reuse.status).toBe(401);
    });

    it('401 senza refresh token', async () => {
      const res = await request(app).post(`${BASE}/refresh`).send({});
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('200 e revoca il refresh (non più utilizzabile)', async () => {
      const reg = await request(app).post(`${BASE}/register`).send(registerPayload());
      const refreshToken = reg.body.data.refresh_token;

      const out = await request(app).post(`${BASE}/logout`).send({ refresh_token: refreshToken });
      expect(out.status).toBe(200);

      const afterLogout = await request(app)
        .post(`${BASE}/refresh`)
        .send({ refresh_token: refreshToken });
      expect(afterLogout.status).toBe(401);
    });

    it('200 idempotente anche senza refresh token', async () => {
      const res = await request(app).post(`${BASE}/logout`).send({});
      expect(res.status).toBe(200);
    });
  });
});
