'use strict';

// Transport nodemailer verso un SMTP sandbox (Mailtrap/Ethereal in sviluppo).
// Il transport è lazy: viene creato al primo invio per non aprire connessioni
// inutili all'avvio e per consentire i test senza SMTP reale.

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'localhost',
    port: Number(process.env.MAIL_PORT || 2525),
    secure: String(process.env.MAIL_SECURE).toLowerCase() === 'true',
    auth:
      process.env.MAIL_USER || process.env.MAIL_PASSWORD
        ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD }
        : undefined,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 7000,
  });

  return transporter;
}

const mailFrom = process.env.MAIL_FROM || 'celesterosa <no-reply@celesterosa.it>';

module.exports = { getTransporter, mailFrom };
