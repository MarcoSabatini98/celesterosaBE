'use strict';

// Wrapper minimale per il caricamento di oggetti su MinIO. Isola il client dal
// resto del codice e centralizza la gestione degli errori.
const { minioClient, BUCKET } = require('../config/minio');

// Carica un buffer come oggetto e restituisce la sua object key.
async function putObject(objectKey, buffer, contentType = 'application/octet-stream') {
  await minioClient.putObject(BUCKET, objectKey, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return objectKey;
}

module.exports = { putObject };
