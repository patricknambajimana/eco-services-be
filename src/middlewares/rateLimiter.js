const rateLimit = require('express-rate-limit');

const make = (windowMs, max, message) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message },
    });

const apiLimiter = make(15 * 60 * 1000, 300, 'Too many requests, please try again later');
/** Strict limiter against brute-force on login / password reset. */
const authLimiter = make(15 * 60 * 1000, 10, 'Too many login attempts, please try again in 15 minutes');

module.exports = { apiLimiter, authLimiter };