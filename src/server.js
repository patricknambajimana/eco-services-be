const env = require('./config/env');
const app = require('./app');
const { pool, testConnection } = require('./config/db');

let server;

const start = async () => {
    try {
        const info = await testConnection();
        console.log(`PostgreSQL connected -> database "${info.db}"`);
    } catch (err) {
        console.error('Cannot connect to PostgreSQL:', err.message);
        console.error('Check DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD in your .env file.');
        process.exit(1);
    }

    server = app.listen(env.port, () => {
        console.log(`API running on   http://localhost:${env.port}/api/v1`);
        console.log(`Swagger docs on  http://localhost:${env.port}/api-docs`);
    });
};

const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    if (!server) return process.exit(0);
    server.close(async () => {
        await pool.end();
        process.exit(0);
    });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));

start();