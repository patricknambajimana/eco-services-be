const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const { apiLimiter } = require('./middlewares/rateLimiter');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// ---------- Security ----------
app.use(
    helmet({
        // Swagger UI needs inline scripts/styles
        contentSecurityPolicy: false,
    })
);
app.use(
    cors({
        origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((o) => o.trim()),
        credentials: true,
    })
);
app.use(hpp());
app.use('/api', apiLimiter);

// ---------- Parsers / utils ----------
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(compression());
if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// ---------- Docs ----------
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Eco-services API Docs' }));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// ---------- API ----------
app.get('/', (_req, res) => res.json({ name: 'Eco-services API', version: '1.0.0', docs: '/api-docs' }));
app.use('/api/v1', routes);

// ---------- Errors ----------
app.use(notFound);
app.use(errorHandler);

module.exports = app;