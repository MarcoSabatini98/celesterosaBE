'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');

const controller = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const schemas = require('../validators/auth.validator');

const router = express.Router();

// Limiter dedicato per le rotte sensibili (login/register/refresh): più
// stringente del rate-limit globale, mitiga brute force e credential stuffing.
const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60_000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Troppi tentativi, riprova più tardi' },
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Registrazione, login e gestione sessione
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registra un nuovo utente cliente
 *     tags: [Auth]
 *     responses:
 *       201:
 *         description: Utente creato, token emessi
 *       409:
 *         description: Email già registrata
 */
router.post('/register', authLimiter, validate(schemas.register), controller.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Autentica un utente ed emette i token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Login riuscito
 *       401:
 *         description: Credenziali non valide
 */
router.post('/login', authLimiter, validate(schemas.login), controller.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Ruota il refresh token ed emette un nuovo access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Nuova coppia di token
 *       401:
 *         description: Refresh token non valido o scaduto
 */
router.post('/refresh', authLimiter, validate(schemas.refresh), controller.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Revoca il refresh token corrente
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout effettuato
 */
router.post('/logout', controller.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Profilo dell'utente autenticato
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dati utente
 *       401:
 *         description: Non autenticato
 */
router.get('/me', authenticate, controller.me);

module.exports = router;
