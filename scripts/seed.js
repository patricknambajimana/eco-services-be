/**
 * Seeds departments, all RBAC roles and the first SUPER_ADMIN account.
 * Usage: npm run seed   (safe to run repeatedly)
 */
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const { pool, withTransaction } = require('../src/config/db');
const { ROLES, ROLE_DESCRIPTIONS } = require('../src/constants/roles');

const DEPARTMENTS = [
    ['Restaurant', 'Manages food service, dining, and kitchen operations'],
    ['Bakery', 'Manages bakery production, coffee services, and counter sales'],
    ['Decoration', 'Manages showroom activities, gift services, and decoration products'],
];

(async () => {
    try {
        await withTransaction(async (db) => {
            for (const [name, description] of DEPARTMENTS) {
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

            const dept = await db.query(`SELECT department_id FROM departments WHERE department_name = 'Restaurant'`);
            const email = 'admin@ecoservices.com';

            const user = await db.query(
                `INSERT INTO users (full_name, email, phone, department_id, status)
         VALUES ('Admin User', $1, '+250780000001', $2, 'ACTIVE')
         ON CONFLICT (email) DO UPDATE SET status = 'ACTIVE'
         RETURNING user_id`,
                [email, dept.rows[0].department_id]
            );
            const userId = user.rows[0].user_id;

            const hash = await bcrypt.hash(env.admin.password, env.bcryptRounds);
            await db.query(
                `INSERT INTO credentials (user_id, username, password_hash, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, is_active = TRUE`,
                [userId, env.admin.username, hash]
            );

            await db.query(
                `INSERT INTO user_roles (user_id, role_id)
         SELECT $1, role_id FROM roles WHERE role_name = $2
         ON CONFLICT DO NOTHING`,
                [userId, ROLES.SUPER_ADMIN]
            );
        });

        console.log('Seed completed.');
        console.log(`Super admin login -> username: ${env.admin.username}  password: ${env.admin.password}`);
        console.log('Change this password after your first login!');
    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();