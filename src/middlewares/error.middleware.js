'use strict';

const multer = require('multer');
const logger = require('../utils/logger');
const { sendFail, sendError } = require('../utils/http.response');
const AppError = require('../errors/AppError');

// Mappatura errori Sequelize → risposta HTTP coerente.
const SEQUELIZE_ERROR_MAP = {
  SequelizeUniqueConstraintError: { status: 409, message: 'Dato già esistente' },
  SequelizeForeignKeyConstraintError: { status: 400, message: 'Riferimento non valido' },
  SequelizeValidationError: { status: 400, message: 'Dati non validi' },
};

// Handler 404 — nessuna rotta ha gestito la richiesta.
function notFoundHandler(req, res) {
  return sendFail(res, 404, { message: `Route non trovata: ${req.method} ${req.originalUrl}` });
}

// Error handler centralizzato (deve avere 4 argomenti per Express).
function errorHandler(err, req, res, _next) {
  logger.error(`${req.method} ${req.originalUrl} → ${err.message}`, { stack: err.stack });

  if (err instanceof multer.MulterError) {
    return sendFail(res, 400, { message: `Upload non valido: ${err.message}` });
  }

  const mapped = SEQUELIZE_ERROR_MAP[err.name];
  if (mapped) return sendFail(res, mapped.status, { message: mapped.message });

  if (err instanceof AppError) {
    return err.statusCode < 500
      ? sendFail(res, err.statusCode, { message: err.message })
      : sendError(res, err.statusCode, err.message);
  }

  return sendError(
    res,
    500,
    process.env.NODE_ENV === 'production' ? 'Errore interno del server' : err.message,
  );
}

module.exports = { notFoundHandler, errorHandler };
