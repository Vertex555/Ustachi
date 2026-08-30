const mongoose = require('mongoose');
const { ApiError, NotFoundError } = require('../utils/ApiError');
const { errorResponse } = require('../utils/ApiResponse');
const logger = require('../utils/logger');

function notFound(req, res, next) {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}

function mapMongooseError(err) {
  if (err.name === 'CastError') {
    return new ApiError(400, `Invalid ${err.path}: ${err.value}`, 'INVALID_ID');
  }
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', details);
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return new ApiError(409, `Duplicate value for ${field}`, 'DUPLICATE_KEY');
  }
  return null;
}

function errorHandler(err, req, res, next) {
  let converted = err;

  if (!(converted instanceof ApiError)) {
    if (err instanceof mongoose.Error) {
      const mapped = mapMongooseError(err);
      if (mapped) converted = mapped;
    }
  }

  if (!(converted instanceof ApiError)) {
    const statusCode = err.statusCode || 500;
    converted = new ApiError(
      statusCode >= 400 && statusCode < 600 ? statusCode : 500,
      err.message || 'Internal server error',
      statusCode >= 500 ? 'SERVER_ERROR' : 'ERROR',
      undefined,
      statusCode >= 500
    );
  }

  if (converted.statusCode >= 500) {
    logger.error({ err: err.stack }, converted.message);
  } else {
    logger.debug({ err: err.message }, converted.message);
  }

  return errorResponse(
    res,
    req,
    converted.statusCode,
    converted.code,
    converted.isOperational ? converted.message : 'Internal server error',
    converted.details
  );
}

module.exports = { notFound, errorHandler };
