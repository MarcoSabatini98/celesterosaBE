'use strict';

// Compone URL pubblici assoluti per gli oggetti su MinIO (S3-compatibile) a
// partire dalla loro object key. Il frontend riceve URL già pronti all'uso
// (vedi environment.mediaBase lato FE).
//
// Formato: {MINIO_PUBLIC_URL}/{MINIO_BUCKET}/{objectKey}

const PUBLIC_URL = (process.env.MINIO_PUBLIC_URL || 'http://localhost:9000').replace(/\/+$/, '');
const BUCKET = process.env.MINIO_BUCKET || 'celesterosa-images';

// Restituisce l'URL assoluto dell'oggetto, o null se la key è assente.
function mediaUrl(objectKey) {
  if (!objectKey) return null;
  return `${PUBLIC_URL}/${BUCKET}/${objectKey}`;
}

module.exports = { mediaUrl };
