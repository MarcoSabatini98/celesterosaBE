'use strict';

// Serializer User → DTO consumati dal frontend.
// Espone solo i campi del contratto FE (AuthUser); password_hash, timestamp e
// metadati interni restano fuori.

// Forma `AuthUser` attesa dal FE.
function toAuthUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone ?? null,
    role: user.role,
    is_active: user.is_active,
  };
}

// Forma `AuthResult` (login/register): utente + coppia di token.
function toAuthResult(user, accessToken, refreshToken) {
  return {
    user: toAuthUser(user),
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

module.exports = { toAuthUser, toAuthResult };
