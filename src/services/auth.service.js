'use strict';

// Logica di autenticazione: registrazione, login, refresh dei token e profilo.

const bcrypt = require('bcrypt');
const AppError = require('../errors/AppError');
const userRepo = require('../repositories/user.repository');
const { ROLES } = require('../constants/roles');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const BCRYPT_ROUNDS = 10;

function buildTokens(user) {
  const payload = { sub: user.id, role: user.role, email: user.email };
  return {
    access_token: signAccessToken(payload),
    refresh_token: signRefreshToken({ sub: user.id }),
  };
}

function sanitize(user) {
  const plain = user.toJSON();
  delete plain.password_hash;
  return plain;
}

async function register({ email, password, first_name, last_name, phone }) {
  const existing = await userRepo.findByEmail(email);
  if (existing) throw AppError.conflict('Email già registrata');

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // Il ruolo è forzato a customer: la registrazione pubblica non crea admin.
  const user = await userRepo.create({
    email,
    password_hash,
    first_name,
    last_name,
    phone: phone || null,
    role: ROLES.CUSTOMER,
  });

  return { user: sanitize(user), ...buildTokens(user) };
}

async function login({ email, password }) {
  const user = await userRepo.findByEmail(email, { withPassword: true });
  if (!user) throw AppError.unauthorized('Credenziali non valide');
  if (!user.is_active) throw AppError.forbidden('Account disabilitato');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw AppError.unauthorized('Credenziali non valide');

  await userRepo.updateLastLogin(user);
  return { user: sanitize(user), ...buildTokens(user) };
}

async function refresh({ refresh_token }) {
  let payload;
  try {
    payload = verifyRefreshToken(refresh_token);
  } catch {
    throw AppError.unauthorized('Refresh token non valido o scaduto');
  }
  const user = await userRepo.findById(payload.sub);
  if (!user || !user.is_active) throw AppError.unauthorized('Utente non valido');

  return buildTokens(user);
}

async function getProfile(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw AppError.notFound('Utente non trovato');
  return sanitize(user);
}

module.exports = { register, login, refresh, getProfile };
