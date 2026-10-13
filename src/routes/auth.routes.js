const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const v = require('../validators/auth.validator');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Login, profile and password management
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with username + password (or PIN)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username: { type: string, example: admin }
 *               password: { type: string, example: Admin@12345 }
 *               pin: { type: string, example: "1234", description: "Use instead of password" }
 *               departmentId: { type: integer, example: 1, description: "Department chosen on the login page" }
 *     responses:
 *       200: { description: Returns JWT token and user profile }
 *       401: { description: Invalid credentials }
 *       429: { description: Too many attempts }
 */
router.post('/login', authLimiter, validate(v.login), ctrl.login);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a temporary password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username: { type: string }
 *     responses:
 *       200: { description: Always the same message (temp password is only returned in development) }
 */
router.post('/forgot-password', authLimiter, validate(v.forgotPassword), ctrl.forgotPassword);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Current user profile, department and roles
 *     responses:
 *       200: { description: Profile }
 *       401: { description: Not authenticated }
 */
router.get('/me', authenticate, ctrl.me);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change your own password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, description: "Min 8 chars, upper, lower and a number" }
 *     responses:
 *       200: { description: Password changed }
 */
router.post('/change-password', authenticate, validate(v.changePassword), ctrl.changePassword);

module.exports = router;