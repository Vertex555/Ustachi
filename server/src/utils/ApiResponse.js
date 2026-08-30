function success(res, data, { statusCode = 200, message, meta } = {}) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(message ? { message } : {}),
    ...(meta ? { meta } : {}),
  });
}

function errorResponse(req, res, statusCode, code, message, details) {
  return res.status(statusCode).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}

function getPagination(query, defaults = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || defaults.page || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(query.pageSize || query.limit, 10) || defaults.pageSize || 20)
  );
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, limit: pageSize };
}

function paginationMeta(page, pageSize, total) {
  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

module.exports = { success, errorResponse, getPagination, paginationMeta };
