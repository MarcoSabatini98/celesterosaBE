'use strict';

// Client Stripe (modalità sandbox/test in sviluppo).
// In assenza di chiave configurata si esporta `null`: i service che usano
// Stripe devono gestire questo caso per non bloccare l'avvio in locale.

const Stripe = require('stripe');
const logger = require('../utils/logger');

const secretKey = process.env.STRIPE_SECRET_KEY;

let stripe = null;
if (secretKey && secretKey.startsWith('sk_')) {
  stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });
} else {
  logger.warn('STRIPE_SECRET_KEY non configurata: i pagamenti sono disabilitati.');
}

module.exports = {
  stripe,
  currency: process.env.STRIPE_CURRENCY || 'eur',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
};
