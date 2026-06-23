'use strict';

// Firma e verifica dei JWT (access + refresh). Issuer/audience validati per
// ridurre il rischio di riuso del token fuori dal contesto applicativo.

const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_TTL = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const ISSUER = process.env.JWT_ISSUER || 'celesterosa';
const AUDIENCE = process.env.JWT_AUDIENCE || 'celesterosa-client';

const baseOptions = { issuer: ISSUER, audience: AUDIENCE };

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { ...baseOptions, expiresIn: ACCESS_TTL });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { ...baseOptions, expiresIn: REFRESH_TTL });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET, baseOptions);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET, baseOptions);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
