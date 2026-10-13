const router = require('express').Router();
const ctrl = require('../controllers/report.controller');
const v = require('../validators/order.validator');
const validate = require('../middlewares/validate');
const { authorize } = require('../middlewares/rbac');
const { GROUPS } = require('../constants/roles');

const REPORT_VIEWERS = [...GROUPS.MANAGERS, ...GROUPS.FINANCE];

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Dashboards and analytics
 */

/**
 * @swagger
 * /reports/dashboard:
 *   get:
 *     tags: [Reports]
 *     summary: Dashboard cards - revenue, active orders, inventory alerts, staff on shift, table occupancy
 *     parameters:
 *       - { in: query, name: departmentId, schema: { type: integer } }
 *     responses:
 *       200: { description: Dashboard data (scoped to your department unless admin/finance) }
 */
router.get('/dashboard', validate(v.report), ctrl.dashboard);

/**
 * @swagger
 * /reports/sales:
 *   get:
 *     tags: [Reports]
 *     summary: Revenue per department per day
 *     parameters:
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: departmentId, schema: { type: integer } }
 *     responses:
 *       200: { description: Sales rows }
 */
router.get('/sales', authorize(REPORT_VIEWERS), validate(v.report), ctrl.sales);

/**
 * @swagger
 * /reports/top-products:
 *   get:
 *     tags: [Reports]
 *     summary: Top 10 best-selling products
 *     parameters:
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: departmentId, schema: { type: integer } }
 *     responses:
 *       200: { description: Products }
 */
router.get('/top-products', authorize(REPORT_VIEWERS), validate(v.report), ctrl.topProducts);

/**
 * @swagger
 * /reports/inventory:
 *   get:
 *     tags: [Reports]
 *     summary: Inventory status summary per department
 *     parameters:
 *       - { in: query, name: departmentId, schema: { type: integer } }
 *     responses:
 *       200: { description: Summary }
 */
router.get('/inventory', authorize(REPORT_VIEWERS), validate(v.report), ctrl.inventory);

/**
 * @swagger
 * /reports/departments:
 *   get:
 *     tags: [Reports]
 *     summary: Cross-department comparison (admins, accountant)
 *     parameters:
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: Comparison }
 */
router.get('/departments', authorize(GROUPS.FINANCE), validate(v.report), ctrl.departmentComparison);

/**
 * @swagger
 * /reports/profit-loss:
 *   get:
 *     tags: [Reports]
 *     summary: Profit & loss estimate (revenue minus product cost price)
 *     parameters:
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: departmentId, schema: { type: integer } }
 *     responses:
 *       200: { description: P&L }
 */
router.get('/profit-loss', authorize(GROUPS.FINANCE), validate(v.report), ctrl.profitLoss);

module.exports = router;