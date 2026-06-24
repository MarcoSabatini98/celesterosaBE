'use strict';

// Upload immagini in memoria (multer). I buffer vengono poi caricati su MinIO
// dal service. Limiti su dimensione, numero file e tipo MIME.
const multer = require('multer');
const AppError = require('../errors/AppError');

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE = Number(process.env.UPLOAD_MAX_FILE_SIZE || 5 * 1024 * 1024); // 5MB
const MAX_FILES = Number(process.env.UPLOAD_MAX_FILES || 8);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter(req, file, cb) {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    return cb(new AppError(`Formato non supportato: ${file.mimetype}`, 422));
  },
});

// Campo form 'images' (vedi AdminService.uploadImages lato FE).
const uploadProductImages = upload.array('images', MAX_FILES);

module.exports = { uploadProductImages };
