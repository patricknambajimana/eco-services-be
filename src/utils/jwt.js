const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signToken = (payload) =>
    jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn, algorithm: 'HS256' });

const verifyToken = (token) => jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });

module.exports = { signToken, verifyToken };