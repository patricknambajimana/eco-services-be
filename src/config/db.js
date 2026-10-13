const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
    ...env.db,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL error:', err.message);
});

/** Run a single parameterised query (always use $1, $2 ... to prevent SQL injection). */
const query = (text, params) => pool.query(text, params);

/** Run several queries atomically. The callback receives a client with .query(). */
const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const testConnection = async () => {
    const { rows } = await pool.query('SELECT current_database() AS db, NOW() AS now');
    return rows[0];
};

module.exports = { pool, query, withTransaction, testConnection };