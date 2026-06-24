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

    req[source] = value;
    return next();
  };
}

module.exports = { validate };
