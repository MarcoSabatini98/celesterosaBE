'use strict';

// Middleware di autenticazione/autorizzazione basati su JWT access token.
//   - requireAuth  : 401 se manca/è invalido il token; popola req.user
//   - optionalAuth : popola req.user se il token è valido, altrimenti prosegue
//                    (usato per le rotte aperte anche ai guest, es. carrello)
//   - requireRole  : authz role-based, da usare dopo requireAuth

const AppError = require('../errors/AppError');
const { verifyAccessToken } = require('../utils/jwt');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

function requireAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next(new AppError('Token mancante', 401));
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch {
    return next(new AppError('Token non valido o scaduto', 401));
  }
}

function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
  } catch {
    // Token presente ma invalido: si prosegue come guest.
  }
  return next();
}

function requireRole(...args) {
  const allowed = Array.isArray(args[0]) ? args[0] : args;
  return (req, _res, next) => {
    if (!req.user || !req.user.role) return next(new AppError('Utente non autenticato', 401));
    if (!allowed.includes(req.user.role)) return next(new AppError('Accesso negato', 403));
    return next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRole };
