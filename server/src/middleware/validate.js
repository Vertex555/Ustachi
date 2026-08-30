const { ValidationErrorApi } = require('../utils/ApiError');

/**
 * validate(schema, source='body') — schema is a Joi schema.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(new ValidationErrorApi(details));
    }

    req[source] = value;
    next();
  };
}

module.exports = { validate };
