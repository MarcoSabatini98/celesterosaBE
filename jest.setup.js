// jest.setup.js
// setupFiles: caricato PRIMA di qualsiasi modulo applicativo. Forza NODE_ENV e
// carica .env.test prima che app.js (require('dotenv').config()) carichi il
// .env di sviluppo — dotenv non sovrascrive variabili già presenti, quindi i
// test puntano sempre al database di test.
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.DOTENV_CONFIG_QUIET = 'true';

require('dotenv').config({ path: path.resolve(__dirname, '.env.test') });

// Default difensivi (se .env.test non li definisce).
process.env.JWT_SECRET ??= 'test-secret-non-usare-in-produzione';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.JWT_ISSUER ??= 'celesterosa';
process.env.JWT_AUDIENCE ??= 'celesterosa-client';
process.env.BCRYPT_ROUNDS ??= '4';

// MinIO: default per i test. Il client non si connette in fase di test (non
// importato da app.js); questi evitano warning di config incompleta.
process.env.MINIO_ENDPOINT ??= '127.0.0.1';
process.env.MINIO_ACCESS_KEY ??= 'minioadmin';
process.env.MINIO_SECRET_KEY ??= 'minioadmin';
process.env.MINIO_BUCKET ??= 'celesterosa-images';

// Stripe: nei test sempre il pagamento simulato (niente chiamate a Stripe).
process.env.STRIPE_SECRET_KEY ??= '';
