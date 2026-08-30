const Joi = require('joi');

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  limit: Joi.number().integer().min(1).max(100),
  sort: Joi.string(),
});

module.exports = { paginationSchema };
