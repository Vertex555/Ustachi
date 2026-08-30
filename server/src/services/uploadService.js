const path = require('path');
const fs = require('fs');
const multer = require('multer');
const config = require('../config');
const { ApiError } = require('../utils/ApiError');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const ensureUploadDir = () => {
  const abs = path.resolve(process.cwd(), config.upload.dir);
  if (!fs.existsSync(abs)) fs.mkdirSync(abs, { recursive: true });
  return abs;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ensureUploadDir()),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const fileFilter = (req, file, cb) => {
  const ok =
    ALLOWED_IMAGE_TYPES.includes(file.mimetype) ||
    ALLOWED_VIDEO_TYPES.includes(file.mimetype);
  if (!ok) cb(new ApiError(400, 'Unsupported file type', 'UNSUPPORTED_MEDIA'));
  else cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter,
});

/** Multer error → ApiError so the error middleware can handle it uniformly. */
async function handleMulterError(err) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      throw new ApiError(400, 'File too large', 'FILE_TOO_LARGE');
    }
    throw new ApiError(400, err.message, 'UPLOAD_ERROR');
  }
  throw err;
}

function toMediaPayload(file) {
  return {
    type: file.mimetype.startsWith('video') ? 'video' : 'image',
    url: `/uploads/${file.filename}`,
    size: file.size,
    mimeType: file.mimetype,
  };
}

module.exports = {
  upload,
  handleMulterError,
  toMediaPayload,
  ensureUploadDir,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
};
