/**
 * Creates / updates all tables in the database configured in .env
 * Usage: npm run migrate
 * (The database itself must already exist - create it in pgAdmin 4 first.)
 */
const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('../src/config/db');

(async () => {
    try {
        const info = await testConnection();
        console.log(`Connected to database "${info.db}"`);

        const sql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
        await pool.query(sql);
        console.log('Schema applied successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();