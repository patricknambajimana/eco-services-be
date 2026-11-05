const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const env = require('./env');
const { pool, withTransaction } = require('./db');
const { ROLES, ROLE_DESCRIPTIONS } = require('../constants/roles');

const departments = [
    ['Restaurant', 'Manages food service, dining, and kitchen operations'],
    ['Bakery', 'Manages bakery production, coffee services, and counter sales'],
    ['Decoration', 'Manages showroom activities, gift services, and decoration products'],
];

const initializeDatabase = async () => {
    const schema = fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8');
    await pool.query(schema);

    await withTransaction(async (db) => {
        for (const [name, description] of departments) {
            await db.query(
                `INSERT INTO departments (department_name, description) VALUES ($1, $2)
                 ON CONFLICT (department_name) DO UPDATE SET description = EXCLUDED.description`,
                [name, description]
            );
        }

        for (const roleName of Object.values(ROLES)) {
            await db.query(
                `INSERT INTO roles (role_name, description) VALUES ($1, $2)
                 ON CONFLICT (role_name) DO UPDATE SET description = EXCLUDED.description`,
                [roleName, ROLE_DESCRIPTIONS[roleName]]
            );
        }

        const dept = await db.query(
            `SELECT department_id FROM departments WHERE department_name = 'Restaurant'`
        );
        const existing = await db.query(
            'SELECT user_id FROM credentials WHERE username = $1',
            [env.admin.username]
        );

        if (!existing.rows[0]) {
            const user = await db.query(
                `INSERT INTO users (full_name, email, phone, department_id, status)
                 VALUES ('Admin User', $1, '+250780000001', $2, 'ACTIVE')
                 ON CONFLICT (email) DO UPDATE SET status = 'ACTIVE'
                 RETURNING user_id`,
                ['admin@ecoservices.com', dept.rows[0].department_id]
            );
            const hash = await bcrypt.hash(env.admin.password, env.bcryptRounds);
            await db.query(
                `INSERT INTO credentials (user_id, username, password_hash, is_active)
                 VALUES ($1, $2, $3, TRUE)
                 ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username,
                   password_hash = EXCLUDED.password_hash, is_active = TRUE`,
                [user.rows[0].user_id, env.admin.username, hash]
            );
            await db.query(
                `INSERT INTO user_roles (user_id, role_id)
                 SELECT $1, role_id FROM roles WHERE role_name = $2
                 ON CONFLICT DO NOTHING`,
                [user.rows[0].user_id, ROLES.SUPER_ADMIN]
            );
        }
    });
};

module.exports = { initializeDatabase };
