const Joi = require('joi');

const phone = Joi.string()
  .pattern(/^\+?[1-9]\d{7,14}$/)
  .required()
  .messages({ 'string.pattern.base': 'Phone number is invalid' });

const password = Joi.string().min(6).max(128).required();

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  phone,
  password,
  role: Joi.string().valid('user', 'master', 'admin').default('user'),
  email: Joi.string().email().optional().allow('', null),
});

const loginSchema = Joi.object({
  phone: Joi.string().pattern(/^\+?[1-9]\d{7,14}$/).required(),
  password: Joi.string().required(),
});

const verifySchema = Joi.object({
  phone: Joi.string().pattern(/^\+?[1-9]\d{7,14}$/).required(),
  code: Joi.string().length(6).pattern(/^\d{6}$/).required(),
  type: Joi.string().valid('register', 'login', 'verify_phone', 'reset').default('register'),
});

const requestOtpSchema = Joi.object({
  phone: Joi.string().pattern(/^\+?[1-9]\d{7,14}$/).required(),
  type: Joi.string().valid('register', 'login', 'verify_phone', 'reset').default('register'),
});

module.exports = { registerSchema, loginSchema, verifySchema, requestOtpSchema };
