const multer = require('multer');
const { upload } = require('../services/uploadService');
const { ApiError } = require('../utils/ApiError');

/**
 * Multer wrapper that converts multer/async errors into ApiError via next().
 */
function handleUpload(field, { maxCount = 1, multiple = false } = {}) {
  return [
    (req, res, next) => {
      const run = multiple ? upload.array(field, maxCount) : upload.single(field);
      run(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(400, 'File too large', 'FILE_TOO_LARGE'));
          }
          return next(new ApiError(400, `Upload error: ${err.message}`, 'UPLOAD_ERROR'));
        }
        if (err) return next(err);
        next();
      });
    },
  ];
}

module.exports = { handleUpload };
