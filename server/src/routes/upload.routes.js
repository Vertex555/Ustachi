const router = require('express').Router();
const { handleUpload } = require('../middleware/upload');
const { toMediaPayload } = require('../services/uploadService');
const { success } = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { ApiError } = require('../utils/ApiError');

// Authenticated image upload (max 1 file).
router.post(
  '/image',
  authenticate,
  handleUpload('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'No file provided', 'NO_FILE');
    const media = toMediaPayload(req.file);
    return success(res, { media }, { statusCode: 201 });
  })
);

// Authenticated video upload (max 1 file, up to 10MB default).
router.post(
  '/video',
  authenticate,
  handleUpload('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'No file provided', 'NO_FILE');
    const media = toMediaPayload(req.file);
    return success(res, { media }, { statusCode: 201 });
  })
);

module.exports = router;
