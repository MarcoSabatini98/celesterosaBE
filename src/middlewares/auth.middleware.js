'use strict';

// Middleware di autenticazione/autorizzazione.
//
// authenticate: obbligatorio. Estrae il Bearer token, lo verifica e carica
//   l'utente in req.user. Rifiuta (401) se manca/non valido/utente disattivo.
// optionalAuth: come sopra ma non blocca se il token manca (req.user resta
//   null). Utile per rotte miste guest/utente (es. checkout).
// requireRole / requireAdmin: autorizzazione per ruolo, da usare DOPO
//   authenticate.
const AppError = require('../errors/AppError');
const { verifyAccessToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');

function extractBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

async function resolveUser(token) {
  const payload = verifyAccessToken(token);
  const user = await userRepository.findById(payload.sub);
  if (!user || !user.is_active) {
    throw AppError.unauthorized('Utente non valido o disattivato');
  }
  return user;
}

async function authenticate(req, _res, next) {
  try {
    const token = extractBearer(req);
    if (!token) throw AppError.unauthorized('Token di accesso mancante');
    req.user = await resolveUser(token);
    return next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    return next(AppError.unauthorized('Token non valido o scaduto'));
  }
}

async function optionalAuth(req, _res, next) {
  try {
    const token = extractBearer(req);
    req.user = token ? await resolveUser(token) : null;
  } catch {
    req.user = null;
  }
  return next();
}

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    return next();
  };
}

const requireAdmin = requireRole('admin');

module.exports = { authenticate, optionalAuth, requireRole, requireAdmin };
