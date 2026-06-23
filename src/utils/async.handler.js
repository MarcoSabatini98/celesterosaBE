'use strict';

// Wrappa un handler async e inoltra ogni errore al middleware centralizzato,
// evitando try/catch ripetuti nei controller.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
