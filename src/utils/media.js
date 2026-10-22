'use strict';

// Compone URL pubblici assoluti per gli oggetti a partire dalla loro object
// key. Il frontend riceve URL già pronti all'uso.
//
// MinIO:      {MINIO_PUBLIC_URL}/{MINIO_BUCKET}/{objectKey}
// Cloudinary: URL pubblico; per i PDF (fatture) link firmato valido 1 ora,
//             perché sono privati.

const { cloudinary, cloudLocation } = require('./storage');

const PUBLIC_URL = (process.env.MINIO_PUBLIC_URL || 'http://localhost:9000').replace(/\/+$/, '');
const BUCKET = process.env.MINIO_BUCKET || 'celesterosa-images';
const SIGNED_URL_TTL_S = 3600;

// Restituisce l'URL assoluto dell'oggetto, o null se la key è assente.
function mediaUrl(objectKey) {
  if (!objectKey) return null;
  if (!cloudinary) return `${PUBLIC_URL}/${BUCKET}/${objectKey}`;

  const { public_id, ...location } = cloudLocation(objectKey);
  if (location.type === 'authenticated') {
    return cloudinary.utils.private_download_url(public_id, '', {
      ...location,
      expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_S,
    });
  }
  return cloudinary.url(public_id, { ...location, secure: true });
}

module.exports = { mediaUrl };
