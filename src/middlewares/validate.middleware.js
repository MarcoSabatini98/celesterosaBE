'use strict';

const { sendFail } = require('../utils/http.response');

const VALID_TARGETS = ['body', 'query', 'params'];

// Factory di validazione Joi su body/query/params. Su errore risponde JSend
// 'fail' con l'elenco dei problemi; in caso di successo sostituisce il target
// col valore normalizzato (stripUnknown).
function validate(schema, target = 'body') {
  if (!VALID_TARGETS.includes(target)) {
    throw new Error(`validate(): target non valido "${target}"`);
  }
  if (!schema || typeof schema.validate !== 'function') {
    throw new Error('validate(): schema Joi non valido');
  }

  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return sendFail(res, 400, {
        message: 'Dati non validi',
        errors: error.details.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    // Express 5: req.query è un getter → va ridefinito, non riassegnato.
    if (target === 'query') {
      Object.defineProperty(req, 'query', { value, writable: true, configurable: true });
    } else {
      req[target] = value;
    }
    return next();
  };
}

module.exports = validate;
