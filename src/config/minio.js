'use strict';

// Client MinIO (object storage S3-compatibile) per le immagini dei prodotti.
// Il bucket viene creato/garantito all'avvio da ensureBucket().

const { Client } = require('minio');
const logger = require('../utils/logger');

const BUCKET = process.env.MINIO_BUCKET || 'celesterosa-images';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: String(process.env.MINIO_USE_SSL).toLowerCase() === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

// Policy pubblica in lettura: le immagini dei prodotti sono servite
// direttamente al frontend tramite URL pubblico.
function publicReadPolicy(bucket) {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  });
}

async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(BUCKET);
    logger.info(`Bucket MinIO creato: ${BUCKET}`);
  }
  await minioClient.setBucketPolicy(BUCKET, publicReadPolicy(BUCKET));
}

// Compone l'URL pubblico di un oggetto a partire dalla sua key.
function publicUrl(objectKey) {
  const base = (process.env.MINIO_PUBLIC_URL || 'http://localhost:9000').replace(/\/+$/, '');
  return `${base}/${BUCKET}/${objectKey}`;
}

module.exports = { minioClient, ensureBucket, publicUrl, BUCKET };
