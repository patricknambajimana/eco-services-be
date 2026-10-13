const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'Eco-services Business Management System API',
            version: '1.0.0',
            description:
                'REST API for the Restaurant, Bakery and Decoration departments.\n\n' +
                '**How to test:** call `POST /auth/login`, copy the `token` from the response, click **Authorize** and paste it.\n\n' +
                'Access is controlled by RBAC roles - a 403 means your role is not allowed to use that endpoint.',
        },
        servers: [{ url: `http://localhost:${env.port}/api/v1`, description: 'Local development' }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                        errors: { type: 'array', items: { type: 'object' } },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: [path.join(__dirname, '../routes/*.js')],
};

module.exports = swaggerJsdoc(options);