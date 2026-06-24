'use strict';

// Logica di business dell'autenticazione: registrazione, login, profilo,
// rotazione del refresh token e logout. Restituisce DTO già pronti per il FE.

const bcrypt = require('bcrypt');
const { sequelize } = require('../models');
const AppError = require('../errors/AppError');
const userRepository = require('../repositories/user.repository');
const refreshTokenRepository = require('../repositories/refreshToken.repository');
const jwtUtil = require('../utils/jwt');
const { toAuthUser, toAuthResult } = require('../serializers/user.serializer');

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

// Emette access token + refresh token (persistito come hash) per l'utente.
// `context` opzionale registra user agent / IP della sessione.
async function issueTokens(user, context = {}, options = {}) {
  const accessToken = jwtUtil.signAccessToken(user);
  const refresh = jwtUtil.generateRefreshToken();

  await refreshTokenRepository.create(
    {
      user_id: user.id,
      token_hash: refresh.tokenHash,
      user_agent: context.userAgent ?? null,
      ip: context.ip ?? null,
      expires_at: refresh.expiresAt,
    },
    options,
  );

  return { accessToken, refreshToken: refresh.token };
}

// Registrazione: crea l'utente (password hashata) ed emette i token in
// un'unica transazione.
async function register(input, context = {}) {
  const existing = await userRepository.findByEmail(input.email);
  if (existing) throw AppError.conflict('Email già registrata');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  return sequelize.transaction(async (transaction) => {
    const user = await userRepository.create(
      {
        email: input.email,
        password_hash: passwordHash,
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone || null,
      },
      { transaction },
    );

    const { accessToken, refreshToken } = await issueTokens(user, context, { transaction });
    return toAuthResult(user, accessToken, refreshToken);
  });
}

// Login: verifica le credenziali (messaggio generico per non rivelare quali
// sono errate) ed emette i token.
async function login(input, context = {}) {
  const user = await userRepository.findByEmail(input.email, { includePassword: true });
  const valid = user && (await bcrypt.compare(input.password, user.password_hash));
  if (!valid) throw AppError.unauthorized('Credenziali non valide');
  if (!user.is_active) throw AppError.forbidden('Account disattivato');

  await userRepository.updateLastLogin(user);
  const { accessToken, refreshToken } = await issueTokens(user, context);
  return toAuthResult(user, accessToken, refreshToken);
}

// Profilo dell'utente autenticato.
function me(user) {
  return toAuthUser(user);
}

// Rotazione: valida il refresh token in ingresso, lo revoca ed emette una nuova
// coppia. Token assente/non valido → 401.
async function refresh(rawToken, context = {}) {
  if (!rawToken) throw AppError.unauthorized('Refresh token mancante');

  const tokenHash = jwtUtil.hashRefreshToken(rawToken);
  const stored = await refreshTokenRepository.findActiveByHash(tokenHash);
  if (!stored) throw AppError.unauthorized('Refresh token non valido o scaduto');

  const user = await userRepository.findById(stored.user_id);
  if (!user || !user.is_active) throw AppError.unauthorized('Utente non valido');

  return sequelize.transaction(async (transaction) => {
    await refreshTokenRepository.revoke(stored);
    const { accessToken, refreshToken } = await issueTokens(user, context, { transaction });
    return toAuthResult(user, accessToken, refreshToken);
  });
}

// Logout: revoca il refresh token fornito (no-op se assente/già revocato).
async function logout(rawToken) {
  if (!rawToken) return;
  const stored = await refreshTokenRepository.findActiveByHash(jwtUtil.hashRefreshToken(rawToken));
  if (stored) await refreshTokenRepository.revoke(stored);
}

module.exports = { register, login, me, refresh, logout };
