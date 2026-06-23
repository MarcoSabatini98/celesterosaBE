'use strict';

// Caricamento/eliminazione oggetti su MinIO. Genera chiavi opache con UUID
// per evitare collisioni e mantenere ordinata la struttura del bucket.

const crypto = require('crypto');
const { minioClient, BUCKET } = require('../config/minio');

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

// Carica un buffer immagine e ritorna la sua object key.
async function uploadImage(buffer, mimetype, prefix = 'products') {
  const ext = EXT_BY_MIME[mimetype] || 'bin';
  const key = `${prefix}/${crypto.randomUUID()}.${ext}`;
  await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
    'Content-Type': mimetype,
  });
  return key;
}

// Carica un PDF (es. fattura) e ritorna la sua object key.
async function uploadPdf(buffer, prefix = 'invoices') {
  const key = `${prefix}/${crypto.randomUUID()}.pdf`;
  await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
    'Content-Type': 'application/pdf',
  });
  return key;
}

async function removeObject(key) {
  if (!key) return;
  await minioClient.removeObject(BUCKET, key);
}

module.exports = { uploadImage, uploadPdf, removeObject };
