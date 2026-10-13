const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/db');

/**
 * Verifies the Bearer token, then reloads the user from the DB so that
 * deactivated / suspended accounts and role changes take effect immediately.
 */
const authenticate = asyncHandler(async (req, _res, next) => {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized('Authentication token missing');

    let decoded;
    try {
        decoded = verifyToken(token);
    } catch (err) {
        throw ApiError.unauthorized(err.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token');
    }

    const { rows } = await query(
        `SELECT u.user_id, u.full_name, u.email, u.department_id, u.status,
            COALESCE(c.is_active, FALSE) AS credential_active,
            COALESCE(ARRAY_AGG(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN credentials c ON c.user_id = u.user_id
       LEFT JOIN user_roles ur ON ur.user_id = u.user_id
       LEFT JOIN roles r ON r.role_id = ur.role_id
      WHERE u.user_id = $1
      GROUP BY u.user_id, c.is_active`,
        [decoded.sub]
    );

    const user = rows[0];
    if (!user) throw ApiError.unauthorized('User no longer exists');
    if (user.status !== 'ACTIVE' || !user.credential_active) {
        throw ApiError.forbidden('Account is not active');
    }

    req.user = {
        id: user.user_id,
        fullName: user.full_name,
        email: user.email,
        departmentId: user.department_id,
        roles: user.roles,
    };
    next();
});

module.exports = { authenticate };