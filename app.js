'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const logger = require('./src/utils/logger');
const swaggerSpec = require('./src/config/swagger');
const routes = require('./src/routes');
const { notFoundHandler, errorHandler } = require('./src/middlewares/error.middleware');

const app = express();

// Dietro reverse-proxy (deploy) per IP reale e rate-limit corretto.
app.set('trust proxy', 1);

// ── Sicurezza & performance ───────────────────────────────────
app.use(helmet());
app.use(compression());

// CORS: lista di origin separata da virgola, slash finale rimosso (evita
// mismatch quando il browser invia origin senza slash).
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4200')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`Origin non consentita: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ── Rate limiting ─────────────────────────────────────────────
// Il webhook Stripe è esente: Stripe ha retry automatici e rate-limitarlo
// disabiliterebbe la consegna degli eventi.
const generalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 200),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use((req, res, next) =>
  req.path.startsWith('/api/v1/stripe/webhook') ? next() : generalLimiter(req, res, next),
);

// ── Body parsing ──────────────────────────────────────────────
// express.json va saltato sul webhook Stripe: la verifica HMAC della firma
// richiede il raw Buffer del body (gestito dentro la route stripe).
app.use((req, res, next) => {
  if (req.path.startsWith('/api/v1/stripe/webhook')) return next();
  return express.json({ limit: '1mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev', { stream: { write: (msg) => logger.http?.(msg.trim()) ?? logger.info(msg.trim()) } }));
}

// ── Documentazione API ────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Routes applicative ────────────────────────────────────────
app.use('/api/v1', routes);

// ── 404 + error handler ───────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
