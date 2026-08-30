const Joi = require('joi');

const masterProfileSchema = Joi.object({
  title: Joi.string().trim().max(120).allow('', null),
  bio: Joi.string().trim().max(1000).allow('', null),
  yearsOfExperience: Joi.number().integer().min(0).max(80),
  skills: Joi.array().items(Joi.string().trim().max(50)),
  devices: Joi.array().items(Joi.string()),
  serviceArea: Joi.string().trim().max(120).allow('', null),
  hourlyRate: Joi.number().min(0),
  isAvailable: Joi.boolean(),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
  }),
});

module.exports = { masterProfileSchema };
