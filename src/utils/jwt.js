'use strict';

// Helper JWT + refresh token.
//
// Access token: JWT firmato (HS256) con JWT_SECRET, breve durata
// (JWT_EXPIRES_IN). Trasporta { sub, role } e viene verificato a ogni
// richiesta protetta — stateless, mai salvato in DB.
//
// Refresh token: stringa opaca casuale (non un JWT). Lunga durata
// (JWT_REFRESH_EXPIRES_IN), consegnata al client e persistita in DB solo come
// hash SHA-256 (vedi RefreshToken). Permette rotazione e revoca.

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_SECRET;
const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const ISSUER = process.env.JWT_ISSUER || 'celesterosa';
const AUDIENCE = process.env.JWT_AUDIENCE || 'celesterosa-client';

if (!ACCESS_SECRET) {
  throw new Error('JWT_SECRET mancante: configurarlo in .env');
}

// Converte una durata stile JWT ('15m', '7d', '3600') in millisecondi.
function durationToMs(value) {
  if (typeof value === 'number') return value * 1000;
  const match = /^(\d+)\s*([smhd])?$/.exec(String(value).trim());
  if (!match) throw new Error(`Durata non valida: ${value}`);
  const amount = Number(match[1]);
  const unit = match[2] || 's';
  const factor = { s: 1e3, m: 60e3, h: 3600e3, d: 86400e3 }[unit];
  return amount * factor;
}

// Firma un access token per l'utente dato.
function signAccessToken(user) {
  return jwt.sign({ role: user.role }, ACCESS_SECRET, {
    subject: String(user.id),
    expiresIn: ACCESS_EXPIRES_IN,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

// Verifica un access token; lancia se non valido/scaduto.
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET, { issuer: ISSUER, audience: AUDIENCE });
}

// Genera un refresh token opaco + il suo hash + la scadenza assoluta.
function generateRefreshToken() {
  const token = crypto.randomBytes(48).toString('base64url');
  return {
    token,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + durationToMs(REFRESH_EXPIRES_IN)),
  };
}

// Hash SHA-256 del refresh token (stessa funzione usata per il confronto).
function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
};
