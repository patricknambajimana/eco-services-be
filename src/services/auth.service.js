const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const env = require('../config/env');
const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');

// Pre-computed hash so login time is the same whether or not the username exists (anti user-enumeration)
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

const getProfile = async (userId) => {
    const { rows } = await query(
        `SELECT u.user_id AS "userId", u.full_name AS "fullName", u.email, u.phone, u.status,
            u.department_id AS "departmentId", d.department_name AS "departmentName",
            c.username,
            COALESCE(ARRAY_AGG(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN departments d ON d.department_id = u.department_id
       LEFT JOIN credentials c ON c.user_id = u.user_id
       LEFT JOIN user_roles ur ON ur.user_id = u.user_id
       LEFT JOIN roles r ON r.role_id = ur.role_id
      WHERE u.user_id = $1
      GROUP BY u.user_id, d.department_name, c.username`,
        [userId]
    );
    if (!rows[0]) throw ApiError.notFound('User not found');
    return rows[0];
};

const login = async ({ username, password, pin, departmentId }) => {
    const { rows } = await query(
        `SELECT c.credential_id, c.user_id, c.password_hash, c.pin_code, c.is_active,
            u.status, u.department_id
       FROM credentials c JOIN users u ON u.user_id = c.user_id
      WHERE c.username = $1`,
        [username]
    );
    const cred = rows[0];

    const secretOk = password
        ? await bcrypt.compare(password, cred ? cred.password_hash : DUMMY_HASH)
        : await bcrypt.compare(pin, cred && cred.pin_code ? cred.pin_code : DUMMY_HASH);

    if (!cred || !secretOk) throw ApiError.unauthorized('Invalid credentials');
    if (!cred.is_active) throw ApiError.forbidden('Credentials are deactivated. Contact your administrator');
    if (cred.status !== 'ACTIVE') throw ApiError.forbidden(`Account is ${cred.status.toLowerCase()}`);

    const profile = await getProfile(cred.user_id);

    // Department selection on the login page: staff may only log into their own department
    const isGlobal = profile.roles.some((r) => ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT'].includes(r));
    if (departmentId && !isGlobal && Number(departmentId) !== profile.departmentId) {
        throw ApiError.forbidden('You do not belong to the selected department');
    }

    await query('UPDATE credentials SET last_login = NOW() WHERE credential_id = $1', [cred.credential_id]);

    const token = signToken({ sub: profile.userId, roles: profile.roles });
    return { token, tokenType: 'Bearer', expiresIn: env.jwt.expiresIn, user: profile };
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
    const { rows } = await query('SELECT password_hash FROM credentials WHERE user_id = $1', [userId]);
    if (!rows[0]) throw ApiError.notFound('Credentials not found');
    if (!(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
        throw ApiError.badRequest('Current password is incorrect');
    }
    const hash = await bcrypt.hash(newPassword, env.bcryptRounds);
    await query('UPDATE credentials SET password_hash = $1 WHERE user_id = $2', [hash, userId]);
};

/**
 * Password-reset request. Generates a temporary password and returns it only outside
 * production (no email/SMS gateway yet). Always responds the same way to avoid
 * revealing which usernames exist.
 */
const forgotPassword = async ({ username }) => {
    const { rows } = await query(
        `SELECT c.user_id FROM credentials c JOIN users u ON u.user_id = c.user_id
      WHERE c.username = $1 AND c.is_active AND u.status = 'ACTIVE'`,
        [username]
    );
    if (!rows[0]) return null;

    const temp = `Tmp${crypto.randomBytes(5).toString('hex')}A1`;
    const hash = await bcrypt.hash(temp, env.bcryptRounds);
    await query('UPDATE credentials SET password_hash = $1 WHERE user_id = $2', [hash, rows[0].user_id]);

    // TODO: send `temp` via email/SMS once a provider is configured
    return env.nodeEnv === 'production' ? null : temp;
};

module.exports = { login, getProfile, changePassword, forgotPassword };