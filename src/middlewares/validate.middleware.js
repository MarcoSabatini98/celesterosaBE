'use strict';

// Middleware di validazione Joi generico. `validate(schema)` valida la sorgente
// indicata (default: body), rimuove i campi sconosciuti e sostituisce la
// sorgente col valore normalizzato (trim, lowercase, default applicati).
const AppError = require('../errors/AppError');

function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(AppError.unprocessable(message));
    }

    // In Express 5 req.query è un getter read-only: l'assegnazione diretta
    // fallisce. defineProperty sostituisce la sorgente in modo uniforme sia per
    // body sia per query.
    Object.defineProperty(req, source, {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    return next();
  };
}

module.exports = { validate };
