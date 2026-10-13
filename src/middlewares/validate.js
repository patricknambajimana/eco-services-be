const ApiError = require('../utils/ApiError');

/**
 * Validate req parts with Joi schemas.
 *   validate({ body: schema, params: schema, query: schema })
 * Unknown keys are stripped (mass-assignment protection).
 */
const validate = (schemas) => (req, _res, next) => {
    const errors = [];
    for (const part of ['params', 'query', 'body']) {
        if (!schemas[part]) continue;
        const { value, error } = schemas[part].validate(req[part], {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
        });
        if (error) {
            error.details.forEach((d) => errors.push({ field: d.path.join('.'), message: d.message.replace(/"/g, '') }));
        } else {
            // req.query is a getter in Express 5, so redefine instead of assigning
            Object.defineProperty(req, part, { value, writable: true, configurable: true, enumerable: true });
        }
    }
    if (errors.length) return next(ApiError.badRequest('Validation failed', errors));
    return next();
};

module.exports = validate;