'use strict';

// Client Stripe (modalità sandbox/test in sviluppo).
// In assenza di chiave configurata si esporta `null`: i service che usano
// Stripe devono gestire questo caso per non bloccare l'avvio in locale.

const Stripe = require('stripe');
const logger = require('../utils/logger');

const secretKey = process.env.STRIPE_SECRET_KEY;

// Le chiavi di esempio (contengono "xxx") non sono valide: in quel caso si
// lavora in modalità SIMULATA (sandbox locale) senza chiamare l'API Stripe.
const isPlaceholder = !secretKey || secretKey.includes('xxx');

let stripe = null;
if (!isPlaceholder && secretKey.startsWith('sk_')) {
  stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });
} else {
  logger.warn('Stripe in modalità SIMULATA: chiavi non configurate (sandbox locale).');
}

module.exports = {
  stripe,
  enabled: !!stripe, // true solo con chiavi reali
  currency: process.env.STRIPE_CURRENCY || 'eur',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
};
