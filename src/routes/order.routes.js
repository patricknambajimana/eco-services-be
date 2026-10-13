const router = require('express').Router();
const ctrl = require('../controllers/order.controller');
const v = require('../validators/order.validator');
const validate = require('../middlewares/validate');
const { authorize } = require('../middlewares/rbac');
const { GROUPS } = require('../constants/roles');

/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: Order creation, tracking and status flow
 *   - name: Customers
 *     description: Customer records
 */

// ================= CUSTOMERS =================
/**
 * @swagger
 * /customers:
 *   get:
 *     tags: [Customers]
 *     summary: Search customers
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Customers }
 *   post:
 *     tags: [Customers]
 *     summary: Create a customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               address: { type: string }
 *     responses:
 *       201: { description: Created }
 */
router.get('/customers', authorize(GROUPS.ORDER_CREATORS), validate(v.customerList), ctrl.listCustomers);
router.post('/customers', authorize(GROUPS.ORDER_CREATORS), validate(v.customerCreate), ctrl.createCustomer);

/**
 * @swagger
 * /customers/{id}:
 *   get:
 *     tags: [Customers]
 *     summary: Get a customer
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Customer }
 *   put:
 *     tags: [Customers]
 *     summary: Update a customer
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               address: { type: string }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Customers]
 *     summary: Delete a customer (admins)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Deleted }
 */
router.get('/customers/:id', authorize(GROUPS.ORDER_CREATORS), validate(v.getOne), ctrl.getCustomer);
router.put('/customers/:id', authorize(GROUPS.ORDER_CREATORS), validate(v.customerUpdate), ctrl.updateCustomer);
router.delete('/customers/:id', authorize(GROUPS.ADMINS), validate(v.getOne), ctrl.deleteCustomer);

// ================= ORDERS =================
/**
 * @swagger
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: List / filter orders (scoped to your department unless admin/finance)
 *     parameters:
 *       - { in: query, name: departmentId, schema: { type: integer } }
 *       - { in: query, name: status, schema: { type: string, enum: [PENDING, CONFIRMED, PREPARING, READY, DELIVERING, COMPLETED] } }
 *       - { in: query, name: paymentStatus, schema: { type: string } }
 *       - { in: query, name: customerId, schema: { type: integer } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Orders }
 *   post:
 *     tags: [Orders]
 *     summary: Create an order (prices and total are calculated on the server)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               departmentId: { type: integer, description: "Only needed for admins; staff use their own department" }
 *               customerId: { type: integer }
 *               orderType: { type: string, enum: [DINE_IN, TAKEAWAY, PICKUP, DELIVERY] }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId: { type: integer }
 *                     quantity: { type: integer }
 *                     notes: { type: string }
 *     responses:
 *       201: { description: Created }
 */
router.get('/orders', validate(v.list), ctrl.listOrders);
router.post('/orders', authorize(GROUPS.ORDER_CREATORS), validate(v.create), ctrl.createOrder);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Order details (items, customer, payments)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Order }
 *   delete:
 *     tags: [Orders]
 *     summary: Delete a PENDING, unpaid order (managers)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Deleted }
 */
router.get('/orders/:id', validate(v.getOne), ctrl.getOrder);
router.delete('/orders/:id', authorize(GROUPS.MANAGERS), validate(v.getOne), ctrl.deleteOrder);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Move an order to its next status (PENDING > CONFIRMED > PREPARING > READY > DELIVERING > COMPLETED)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [PENDING, CONFIRMED, PREPARING, READY, DELIVERING, COMPLETED] }
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Invalid status jump }
 */
router.patch('/orders/:id/status', validate(v.updateStatus), ctrl.updateStatus);

module.exports = router;