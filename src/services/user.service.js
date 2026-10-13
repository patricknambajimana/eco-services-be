const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { query, withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta, WhereBuilder } = require('../utils/pagination');
const { isGlobalUser, resolveDepartment } = require('../utils/department');
const { ROLES } = require('../constants/roles');

const USER_SELECT = `
  SELECT u.user_id AS "userId", u.full_name AS "fullName", u.email, u.phone, u.status,
         u.department_id AS "departmentId", d.department_name AS "departmentName",
         u.created_at AS "createdAt", c.username, c.is_active AS "credentialActive", c.last_login AS "lastLogin",
         COALESCE(ARRAY_AGG(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') AS roles
    FROM users u
    LEFT JOIN departments d ON d.department_id = u.department_id
    LEFT JOIN credentials c ON c.user_id = u.user_id
    LEFT JOIN user_roles ur ON ur.user_id = u.user_id
    LEFT JOIN roles r ON r.role_id = ur.role_id`;
const USER_GROUP = 'GROUP BY u.user_id, d.department_name, c.username, c.is_active, c.last_login';

const hashSecret = (v) => bcrypt.hash(v, env.bcryptRounds);

const assertCanManage = (actor, targetDepartmentId, targetRoles = []) => {
    if (!isGlobalUser(actor) && Number(actor.departmentId) !== Number(targetDepartmentId)) {
        throw ApiError.forbidden('You can only manage staff of your own department');
    }
    // Only SUPER_ADMIN may hand out the SUPER_ADMIN role
    if (targetRoles.includes(ROLES.SUPER_ADMIN) && !actor.roles.includes(ROLES.SUPER_ADMIN)) {
        throw ApiError.forbidden('Only a SUPER_ADMIN can assign the SUPER_ADMIN role');
    }
};

const setRoles = async (db, userId, roleNames) => {
    const { rows } = await db.query('SELECT role_id, role_name FROM roles WHERE role_name = ANY($1)', [roleNames]);
    if (rows.length !== roleNames.length) throw ApiError.badRequest('One or more roles do not exist. Run npm run seed');
    await db.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    for (const r of rows) {
        await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, r.role_id]);
    }
};

const list = async (actor, q) => {
    const { page, limit, offset } = getPagination(q);
    const w = new WhereBuilder();
    const dept = resolveDepartment(actor, q.departmentId);
    if (dept) w.add('u.department_id = ?', dept);
    if (q.status) w.add('u.status = ?', q.status);
    if (q.search) w.add('(u.full_name ILIKE ? OR u.email ILIKE ?)', `%${q.search}%`);
    if (q.role) w.add('EXISTS (SELECT 1 FROM user_roles x JOIN roles xr ON xr.role_id = x.role_id WHERE x.user_id = u.user_id AND xr.role_name = ?)', q.role);

    const total = await query(`SELECT COUNT(*)::int AS n FROM users u ${w.sql}`, w.params);
    const { rows } = await query(
        `${USER_SELECT} ${w.sql} ${USER_GROUP} ORDER BY u.created_at DESC LIMIT $${w.params.length + 1} OFFSET $${w.params.length + 2}`,
        [...w.params, limit, offset]
    );
    return { rows, meta: buildMeta(page, limit, total.rows[0].n) };
};

const getById = async (actor, id) => {
    const { rows } = await query(`${USER_SELECT} WHERE u.user_id = $1 ${USER_GROUP}`, [id]);
    if (!rows[0]) throw ApiError.notFound('Staff member not found');
    if (!isGlobalUser(actor) && rows[0].departmentId !== actor.departmentId) throw ApiError.forbidden();
    return rows[0];
};

const create = async (actor, data) => {
    assertCanManage(actor, data.departmentId, data.roles);
    const id = await withTransaction(async (db) => {
        const { rows } = await db.query(
            `INSERT INTO users (full_name, email, phone, department_id, status)
       VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
            [data.fullName, data.email, data.phone || null, data.departmentId || null, data.status]
        );
        const userId = rows[0].user_id;
        await setRoles(db, userId, data.roles);
        if (data.username) {
            await db.query(
                `INSERT INTO credentials (user_id, username, password_hash, pin_code) VALUES ($1,$2,$3,$4)`,
                [userId, data.username, await hashSecret(data.password), data.pin ? await hashSecret(data.pin) : null]
            );
        }
        return userId;
    });
    return getById(actor, id);
};

const update = async (actor, id, data) => {
    const current = await getById(actor, id);
    assertCanManage(actor, data.departmentId !== undefined ? data.departmentId : current.departmentId, data.roles || []);

    await withTransaction(async (db) => {
        const map = { fullName: 'full_name', email: 'email', phone: 'phone', departmentId: 'department_id', status: 'status' };
        const sets = []; const params = [];
        for (const [k, col] of Object.entries(map)) {
            if (data[k] !== undefined) { params.push(data[k]); sets.push(`${col} = $${params.length}`); }
        }
        if (sets.length) {
            params.push(id);
            await db.query(`UPDATE users SET ${sets.join(', ')} WHERE user_id = $${params.length}`, params);
        }
        if (data.roles) await setRoles(db, id, data.roles);
    });
    return getById(actor, id);
};

const setStatus = async (actor, id, status) => {
    if (id === actor.id) throw ApiError.badRequest('You cannot change your own status');
    await getById(actor, id);
    await query('UPDATE users SET status = $1 WHERE user_id = $2', [status, id]);
    return getById(actor, id);
};

const remove = async (actor, id) => {
    if (id === actor.id) throw ApiError.badRequest('You cannot delete your own account');
    await getById(actor, id);
    await query('DELETE FROM users WHERE user_id = $1', [id]);
};

// ---------- credentials ----------
const createCredentials = async (actor, userId, { username, password, pin }) => {
    await getById(actor, userId);
    await query(
        `INSERT INTO credentials (user_id, username, password_hash, pin_code) VALUES ($1,$2,$3,$4)`,
        [userId, username, await hashSecret(password), pin ? await hashSecret(pin) : null]
    );
    return getById(actor, userId);
};

const resetCredentials = async (actor, userId, { newPassword, pin }) => {
    await getById(actor, userId);
    const { rowCount } = await query(
        `UPDATE credentials SET password_hash = $1, pin_code = COALESCE($2, pin_code) WHERE user_id = $3`,
        [await hashSecret(newPassword), pin ? await hashSecret(pin) : null, userId]
    );
    if (!rowCount) throw ApiError.notFound('This user has no credentials yet');
};

const setCredentialActive = async (actor, userId, isActive) => {
    if (userId === actor.id && !isActive) throw ApiError.badRequest('You cannot deactivate your own credentials');
    await getById(actor, userId);
    const { rowCount } = await query('UPDATE credentials SET is_active = $1 WHERE user_id = $2', [isActive, userId]);
    if (!rowCount) throw ApiError.notFound('This user has no credentials yet');
};

// ---------- schedules ----------
const SCHEDULE_SELECT = `
  SELECT s.schedule_id AS "scheduleId", s.user_id AS "userId", u.full_name AS "fullName",
         u.department_id AS "departmentId", s.shift_date AS "shiftDate",
         s.start_time AS "startTime", s.end_time AS "endTime", s.status
    FROM staff_schedules s JOIN users u ON u.user_id = s.user_id`;

const listSchedules = async (actor, q) => {
    const { page, limit, offset } = getPagination(q);
    const w = new WhereBuilder();
    const dept = resolveDepartment(actor, q.departmentId);
    if (dept) w.add('u.department_id = ?', dept);
    if (q.userId) w.add('s.user_id = ?', q.userId);
    if (q.from) w.add('s.shift_date >= ?', q.from);
    if (q.to) w.add('s.shift_date <= ?', q.to);
    const total = await query(`SELECT COUNT(*)::int AS n FROM staff_schedules s JOIN users u ON u.user_id = s.user_id ${w.sql}`, w.params);
    const { rows } = await query(
        `${SCHEDULE_SELECT} ${w.sql} ORDER BY s.shift_date, s.start_time LIMIT $${w.params.length + 1} OFFSET $${w.params.length + 2}`,
        [...w.params, limit, offset]
    );
    return { rows, meta: buildMeta(page, limit, total.rows[0].n) };
};

const createSchedule = async (actor, d) => {
    const target = await getById(actor, d.userId);
    if (d.endTime <= d.startTime) throw ApiError.badRequest('endTime must be after startTime');
    const overlap = await query(
        `SELECT 1 FROM staff_schedules WHERE user_id = $1 AND shift_date = $2
        AND status <> 'CANCELLED' AND start_time < $4 AND end_time > $3`,
        [d.userId, d.shiftDate, d.startTime, d.endTime]
    );
    if (overlap.rowCount) throw ApiError.conflict(`${target.fullName} already has an overlapping shift on that day`);
    const { rows } = await query(
        `INSERT INTO staff_schedules (user_id, shift_date, start_time, end_time, status)
     VALUES ($1,$2,$3,$4,$5) RETURNING schedule_id`,
        [d.userId, d.shiftDate, d.startTime, d.endTime, d.status]
    );
    const res = await query(`${SCHEDULE_SELECT} WHERE s.schedule_id = $1`, [rows[0].schedule_id]);
    return res.rows[0];
};

const updateSchedule = async (actor, id, d) => {
    const cur = await query(`${SCHEDULE_SELECT} WHERE s.schedule_id = $1`, [id]);
    if (!cur.rows[0]) throw ApiError.notFound('Schedule not found');
    if (!isGlobalUser(actor) && cur.rows[0].departmentId !== actor.departmentId) throw ApiError.forbidden();
    const map = { shiftDate: 'shift_date', startTime: 'start_time', endTime: 'end_time', status: 'status' };
    const sets = []; const params = [];
    for (const [k, col] of Object.entries(map)) {
        if (d[k] !== undefined) { params.push(d[k]); sets.push(`${col} = $${params.length}`); }
    }
    params.push(id);
    await query(`UPDATE staff_schedules SET ${sets.join(', ')} WHERE schedule_id = $${params.length}`, params);
    return (await query(`${SCHEDULE_SELECT} WHERE s.schedule_id = $1`, [id])).rows[0];
};

const deleteSchedule = async (actor, id) => {
    const cur = await query(`${SCHEDULE_SELECT} WHERE s.schedule_id = $1`, [id]);
    if (!cur.rows[0]) throw ApiError.notFound('Schedule not found');
    if (!isGlobalUser(actor) && cur.rows[0].departmentId !== actor.departmentId) throw ApiError.forbidden();
    await query('DELETE FROM staff_schedules WHERE schedule_id = $1', [id]);
};

module.exports = {
    list, getById, create, update, setStatus, remove,
    createCredentials, resetCredentials, setCredentialActive,
    listSchedules, createSchedule, updateSchedule, deleteSchedule,
};