'use strict';

// Accesso dati per i refresh token persistiti. Si lavora sempre con l'hash
// del token, mai col valore in chiaro.
const { Op } = require('sequelize');
const { RefreshToken } = require('../models');

function create(data, options = {}) {
  return RefreshToken.create(data, options);
}

function findActiveByHash(tokenHash) {
  return RefreshToken.findOne({
    where: {
      token_hash: tokenHash,
      revoked_at: null,
      expires_at: { [Op.gt]: new Date() },
    },
  });
}

function revoke(token, when = new Date()) {
  return token.update({ revoked_at: when });
}

// Revoca tutti i token attivi di un utente (logout globale / cambio password).
function revokeAllForUser(userId, when = new Date()) {
  return RefreshToken.update(
    { revoked_at: when },
    { where: { user_id: userId, revoked_at: null } },
  );
}

// Pulizia: elimina i token scaduti o revocati (uso da job schedulato).
function purgeExpired(now = new Date()) {
  return RefreshToken.destroy({
    where: {
      [Op.or]: [{ expires_at: { [Op.lt]: now } }, { revoked_at: { [Op.ne]: null } }],
    },
  });
}

module.exports = { create, findActiveByHash, revoke, revokeAllForUser, purgeExpired };
