'use strict';

// Multer in memoria: i file restano in RAM come Buffer e vengono poi caricati
// su MinIO dal storage.service (nessuna scrittura su disco locale).

const multer = require('multer');

const MAX_MB = Number(process.env.UPLOAD_MAX_MB || 8);
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Formato immagine non supportato'));
  },
});

module.exports = { upload };
