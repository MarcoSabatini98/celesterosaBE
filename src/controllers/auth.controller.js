'use strict';

// Controller HTTP per l'autenticazione. Adatta req/res al service e risponde in
// formato JSend. Gli errori async sono inoltrati all'error handler (Express 5
// cattura le promise rifiutate automaticamente).
const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/http.response');

// Metadati della sessione (per audit / revoca selettiva dei refresh token).
function sessionContext(req) {
  return { userAgent: req.headers['user-agent'] || null, ip: req.ip || null };
}

// Il refresh token può arrivare dal body (client SPA) o da un cookie httpOnly.
function readRefreshToken(req) {
  return req.body?.refresh_token || req.cookies?.refresh_token || null;
}

async function register(req, res) {
  const result = await authService.register(req.body, sessionContext(req));
  return sendSuccess(res, 201, result);
}

async function login(req, res) {
  const result = await authService.login(req.body, sessionContext(req));
  return sendSuccess(res, 200, result);
}

async function me(req, res) {
  return sendSuccess(res, 200, authService.me(req.user));
}

async function refresh(req, res) {
  const result = await authService.refresh(readRefreshToken(req), sessionContext(req));
  return sendSuccess(res, 200, result);
}

async function logout(req, res) {
  await authService.logout(readRefreshToken(req));
  return sendSuccess(res, 200, { message: 'Logout effettuato' });
}

module.exports = { register, login, me, refresh, logout };
