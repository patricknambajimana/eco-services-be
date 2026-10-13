const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const departmentRoutes = require('./department.routes');
const inventoryRoutes = require('./inventory.routes');
const productRoutes = require('./product.routes');
const orderRoutes = require('./order.routes');
const paymentRoutes = require('./payment.routes');
const reportRoutes = require('./report.routes');

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     security: []
 *     responses:
 *       200: { description: API is running }
 */
router.get('/health', (_req, res) => res.json({ success: true, message: 'NPGroup API is running', time: new Date() }));

// Public (login handles its own auth; GET /departments is public for the login page)
router.use('/auth', authRoutes);
router.use('/departments', departmentRoutes);

// Everything below requires a valid token
router.use('/staff', authenticate, userRoutes);
router.use('/inventory', authenticate, inventoryRoutes);
router.use('/payments', authenticate, paymentRoutes);
router.use('/reports', authenticate, reportRoutes);
// product + order routers define several top-level paths (/products, /recipes, /tables, /production, /customers, /orders)
router.use('/', authenticate, productRoutes);
router.use('/', authenticate, orderRoutes);

module.exports = router;