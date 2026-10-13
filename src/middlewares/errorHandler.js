const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const notFound = (req, _res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));

/** Translate common PostgreSQL error codes into clean API errors. */
const mapPgError = (err) => {
    switch (err.code) {
        case '23505': return new ApiError(409, 'Duplicate value: record already exists', err.detail);
        case '23503': return new ApiError(409, 'Invalid reference or record is still in use', err.detail);
        case '23502': return new ApiError(400, `Missing required field: ${err.column}`);
        case '23514': return new ApiError(400, 'A value violates a database rule (check constraint)', err.constraint);
        case '22P02': return new ApiError(400, 'Invalid data format');
        default: return null;
    }
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
    let error = err;
    if (!(error instanceof ApiError)) error = mapPgError(err) || error;
    if (error.type === 'entity.parse.failed') error = ApiError.badRequest('Malformed JSON body');

    const status = error.statusCode || 500;
    if (status >= 500) console.error(`[${req.method}] ${req.originalUrl} ->`, err);

    const body = {
        success: false,
        message: status >= 500 && env.nodeEnv === 'production' ? 'Internal server error' : error.message,
    };
    if (error.details) body.errors = error.details;
    if (env.nodeEnv !== 'production' && status >= 500) body.stack = err.stack;

    res.status(status).json(body);
};

module.exports = { notFound, errorHandler };