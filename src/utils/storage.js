'use strict';

// Caricamento/rimozione degli oggetti (immagini, PDF fatture). In locale MinIO
// (docker compose); in deploy, con CLOUDINARY_URL impostato, Cloudinary.
// Le object key restano le stesse (es. products/1/cover.svg): su Cloudinary
// diventano file "raw" sotto la cartella celesterosa/.

const { minioClient, BUCKET } = require('../config/minio');

// L'SDK legge CLOUDINARY_URL da solo: caricato solo se serve.
const cloudinary = process.env.CLOUDINARY_URL ? require('cloudinary').v2 : null;

// Dove sta l'oggetto su Cloudinary. Le fatture (PDF) sono private: si scaricano
// solo con un link firmato a scadenza (vedi utils/media.js).
function cloudLocation(objectKey) {
  return {
    public_id: `celesterosa/${objectKey}`,
    resource_type: 'raw',
    type: objectKey.endsWith('.pdf') ? 'authenticated' : 'upload',
  };
}

// Carica un buffer come oggetto e restituisce la sua object key.
async function putObject(objectKey, buffer, contentType = 'application/octet-stream') {
  if (cloudinary) {
    await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ ...cloudLocation(objectKey), overwrite: true }, (err) =>
          err ? reject(err) : resolve(),
        )
        .end(buffer);
    });
    return objectKey;
  }
  await minioClient.putObject(BUCKET, objectKey, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return objectKey;
}

// Rimuove un oggetto (best-effort: gli errori sono propagati al chiamante).
async function removeObject(objectKey) {
  if (cloudinary) {
    const { public_id, ...location } = cloudLocation(objectKey);
    await cloudinary.uploader.destroy(public_id, { ...location, invalidate: true });
    return;
  }
  await minioClient.removeObject(BUCKET, objectKey);
}

module.exports = { putObject, removeObject, cloudinary, cloudLocation };
