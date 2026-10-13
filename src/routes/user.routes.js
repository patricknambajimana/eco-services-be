const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const v = require('../validators/user.validator');
const validate = require('../middlewares/validate');
const { authorize } = require('../middlewares/rbac');
const { GROUPS } = require('../constants/roles');

/**
 * @swagger
 * tags:
 *   - name: Staff
 *     description: Staff management, credentials and RBAC roles
 *   - name: Schedules
 *     description: Staff shifts
 */

// ---------- schedules (declared first so '/schedules' is not captured by '/:id') ----------
/**
 * @swagger
 * /staff/schedules:
 *   get:
 *     tags: [Schedules]
 *     summary: List shifts (calendar data)
 *     parameters:
 *       - { in: query, name: userId, schema: { type: integer } }
 *       - { in: query, name: departmentId, schema: { type: integer } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Shifts }
 *   post:
 *     tags: [Schedules]
 *     summary: Create a shift (managers)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, shiftDate, startTime, endTime]
 *             properties:
 *               userId: { type: integer }
 *               shiftDate: { type: string, format: date, example: "2026-10-20" }
 *               startTime: { type: string, example: "08:00" }
 *               endTime: { type: string, example: "16:00" }
 *               status: { type: string, enum: [SCHEDULED, COMPLETED, CANCELLED, ABSENT] }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Overlapping shift }
 */
router.get('/schedules', validate(v.scheduleList), ctrl.listSchedules);
router.post('/schedules', authorize(GROUPS.MANAGERS), validate(v.scheduleCreate), ctrl.createSchedule);

/**
 * @swagger
 * /staff/schedules/{id}:
 *   put:
 *     tags: [Schedules]
 *     summary: Update a shift (managers)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shiftDate: { type: string, format: date }
 *               startTime: { type: string }
 *               endTime: { type: string }
 *               status: { type: string }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Schedules]
 *     summary: Delete a shift (managers)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Deleted }
 */
router.put('/schedules/:id', authorize(GROUPS.MANAGERS), validate(v.scheduleUpdate), ctrl.updateSchedule);
router.delete('/schedules/:id', authorize(GROUPS.MANAGERS), validate({ params: v.getOne.params }), ctrl.deleteSchedule);

// ---------- staff ----------
/**
 * @swagger
 * /staff:
 *   get:
 *     tags: [Staff]
 *     summary: List / search staff (managers; department managers only see their department)
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: departmentId, schema: { type: integer } }
 *       - { in: query, name: status, schema: { type: string, enum: [ACTIVE, INACTIVE, SUSPENDED, ON_LEAVE] } }
 *       - { in: query, name: role, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Staff list with pagination meta }
 *   post:
 *     tags: [Staff]
 *     summary: Add a staff member (optionally with login credentials)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, roles]
 *             properties:
 *               fullName: { type: string, example: Chef Jean }
 *               email: { type: string, example: jean.chef@ecoservices.com }
 *               phone: { type: string }
 *               departmentId: { type: integer, example: 1 }
 *               status: { type: string }
 *               roles: { type: array, items: { type: string }, example: [RESTAURANT_CHEF] }
 *               username: { type: string, example: jean }
 *               password: { type: string, example: Chef@12345 }
 *               pin: { type: string, example: "4321" }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Email or username already exists }
 */
router.get('/', authorize(GROUPS.MANAGERS), validate(v.list), ctrl.list);
router.post('/', authorize(GROUPS.MANAGERS), validate(v.create), ctrl.create);

/**
 * @swagger
 * /staff/{id}:
 *   get:
 *     tags: [Staff]
 *     summary: Get one staff member
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Staff member }
 *       404: { description: Not found }
 *   put:
 *     tags: [Staff]
 *     summary: Edit staff information, department, roles
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               departmentId: { type: integer }
 *               status: { type: string }
 *               roles: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Staff]
 *     summary: Delete a staff member (admins)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Deleted }
 */
router.get('/:id', authorize(GROUPS.MANAGERS), validate(v.getOne), ctrl.getOne);
router.put('/:id', authorize(GROUPS.MANAGERS), validate(v.update), ctrl.update);
router.delete('/:id', authorize(GROUPS.ADMINS), validate(v.getOne), ctrl.remove);

/**
 * @swagger
 * /staff/{id}/status:
 *   patch:
 *     tags: [Staff]
 *     summary: Change staff status (ACTIVE / INACTIVE / SUSPENDED / ON_LEAVE)
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
 *               status: { type: string, enum: [ACTIVE, INACTIVE, SUSPENDED, ON_LEAVE] }
 *     responses:
 *       200: { description: Updated }
 */
router.patch('/:id/status', authorize(GROUPS.MANAGERS), validate(v.setStatus), ctrl.setStatus);

/**
 * @swagger
 * /staff/{id}/credentials:
 *   post:
 *     tags: [Staff]
 *     summary: Create login credentials for a staff member (admins)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *               pin: { type: string }
 *     responses:
 *       201: { description: Created }
 *   put:
 *     tags: [Staff]
 *     summary: Reset password / PIN (admins)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword: { type: string }
 *               pin: { type: string }
 *     responses:
 *       200: { description: Reset }
 */
router.post('/:id/credentials', authorize(GROUPS.ADMINS), validate(v.createCredentials), ctrl.createCredentials);
router.put('/:id/credentials', authorize(GROUPS.ADMINS), validate(v.resetCredentials), ctrl.resetCredentials);

/**
 * @swagger
 * /staff/{id}/credentials/active:
 *   patch:
 *     tags: [Staff]
 *     summary: Activate / deactivate credentials (admins)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Updated }
 */
router.patch('/:id/credentials/active', authorize(GROUPS.ADMINS), validate(v.setCredentialActive), ctrl.setCredentialActive);

module.exports = router;