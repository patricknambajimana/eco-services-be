const router = require('express').Router();
const ctrl = require('../controllers/department.controller');
const { Joi, idParam } = require('../validators/common');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');
const { GROUPS } = require('../constants/roles');

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Departments and RBAC roles
 */

/**
 * @swagger
 * /departments:
 *   get:
 *     tags: [Departments]
 *     summary: List departments (public - used by the login page department selector)
 *     security: []
 *     responses:
 *       200: { description: Departments }
 */
router.get('/', ctrl.list);

/**
 * @swagger
 * /departments/roles:
 *   get:
 *     tags: [Departments]
 *     summary: List all RBAC roles (admins)
 *     responses:
 *       200: { description: Roles }
 */
router.get('/roles', authenticate, authorize(GROUPS.ADMINS), ctrl.listRoles);

/**
 * @swagger
 * /departments/{id}:
 *   put:
 *     tags: [Departments]
 *     summary: Update department name / description (admins)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               departmentName: { type: string }
 *               description: { type: string }
 *     responses:
 *       200: { description: Updated }
 */
router.put(
    '/:id',
    authenticate,
    authorize(GROUPS.ADMINS),
    validate({
        params: idParam(),
        body: Joi.object({ departmentName: Joi.string().trim().max(100), description: Joi.string().allow('', null) }).min(1),
    }),
    ctrl.update
);

module.exports = router;