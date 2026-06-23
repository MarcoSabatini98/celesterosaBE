'use strict';

const express = require('express');
const router = express.Router();

const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/auth.validator');
const authController = require('../controllers/auth.controller');

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Registrazione, login e gestione token
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registra un nuovo cliente
 *     tags: [Auth]
 *     responses:
 *       201: { description: Utente creato con token }
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login con email e password
 *     tags: [Auth]
 *     responses:
 *       200: { description: Token di accesso e refresh }
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Rinnova l'access token tramite refresh token
 *     tags: [Auth]
 *     responses:
 *       200: { description: Nuovi token }
 */
router.post('/refresh', validate(refreshSchema), authController.refresh);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Profilo dell'utente autenticato
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dati del profilo }
 */
router.get('/me', requireAuth, authController.me);

module.exports = router;
