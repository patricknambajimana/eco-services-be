const router = require('express').Router();
const ctrl = require('../controllers/payment.controller');
const v = require('../validators/order.validator');
const validate = require('../middlewares/validate');
const { authorize } = require('../middlewares/rbac');
const { GROUPS, ROLES } = require('../constants/roles');

const VIEWERS = [...GROUPS.CASHIERS, ...GROUPS.FINANCE];
const REFUNDERS = [ROLES.GENERAL_MANAGER, ROLES.RESTAURANT_CASHIER, ROLES.BAKERY_CASHIER, ROLES.DECORATION_CASHIER];

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payments, refunds and receipts
 */

/**
 * @swagger
 * /payments:
 *   get:
 *     tags: [Payments]
 *     summary: List payments
 *     parameters:
 *       - { in: query, name: orderId, schema: { type: integer } }
 *       - { in: query, name: departmentId, schema: { type: integer } }
 *       - { in: query, name: method, schema: { type: string, enum: [CASH, CARD, MOBILE_MONEY] } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Payments }
 *   post:
 *     tags: [Payments]
 *     summary: Record a payment (order becomes PARTIAL or PAID automatically)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, amount, paymentMethod]
 *             properties:
 *               orderId: { type: integer }
 *               amount: { type: number }
 *               paymentMethod: { type: string, enum: [CASH, CARD, MOBILE_MONEY] }
 *     responses:
 *       201: { description: Recorded }
 *       400: { description: Amount exceeds balance / already paid }
 */
router.get('/', authorize(VIEWERS), validate(v.paymentList), ctrl.list);
router.post('/', authorize(GROUPS.CASHIERS), validate(v.paymentCreate), ctrl.create);

/**
 * @swagger
 * /payments/receipt/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Receipt data for an order (items, payments, balance)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer }, description: Order ID }
 *     responses:
 *       200: { description: Receipt }
 */
router.get('/receipt/:id', authorize(VIEWERS), validate(v.getOne), ctrl.receipt);

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get a payment
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Payment }
 */
router.get('/:id', authorize(VIEWERS), validate(v.getOne), ctrl.getOne);

/**
 * @swagger
 * /payments/{id}/refund:
 *   post:
 *     tags: [Payments]
 *     summary: Refund a successful payment (cashiers / general manager)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Refunded }
 */
router.post('/:id/refund', authorize(REFUNDERS), validate(v.refund), ctrl.refund);

module.exports = router;