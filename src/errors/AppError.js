'use strict';

// Errore applicativo con codice HTTP esplicito. I service lanciano AppError
// per i casi previsti (404, 409, 422...) e l'error middleware li mappa in
// risposte JSend coerenti.
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = 'Richiesta non valida') {
    return new AppError(message, 400);
  }

  static unauthorized(message = 'Non autenticato') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Accesso negato') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Risorsa non trovata') {
    return new AppError(message, 404);
  }

  static conflict(message = 'Conflitto: dato già esistente') {
    return new AppError(message, 409);
  }

  static unprocessable(message = 'Dati non processabili') {
    return new AppError(message, 422);
  }
}

module.exports = AppError;
