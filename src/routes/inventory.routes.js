const router = require('express').Router();
const ctrl = require('../controllers/inventory.controller');
const v = require('../validators/inventory.validator');
const validate = require('../middlewares/validate');
const { authorize } = require('../middlewares/rbac');
const { GROUPS } = require('../constants/roles');

/**
 * @swagger
 * tags:
 *   - name: Inventory
 *     description: Items, stock status and alerts
 *   - name: Stock Movements
 *     description: Every inventory transaction
 *   - name: Requisitions
 *     description: Stock requests (Request -> Review -> Approved/Rejected -> Fulfilled)
 *   - name: Suppliers
 *     description: Supplier management
 */

// ================= ITEMS =================
/**
 * @swagger
 * /inventory/items:
 *   get:
 *     tags: [Inventory]
 *     summary: List inventory items (scoped to your department unless you are admin/manager)
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: departmentId, schema: { type: integer } }
 *       - { in: query, name: category, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [AVAILABLE, LOW STOCK, CRITICAL, OUT OF STOCK, EXPIRED] } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Items with pagination meta }
 *   post:
 *     tags: [Inventory]
 *     summary: Create an inventory item (stock managers)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [departmentId, productName, category]
 *             properties:
 *               departmentId: { type: integer, example: 2 }
 *               productName: { type: string, example: Flour }
 *               category: { type: string, example: Ingredients }
 *               quantity: { type: number, example: 50 }
 *               minStockLevel: { type: number, example: 10 }
 *               unit: { type: string, example: kg }
 *               expiryDate: { type: string, format: date }
 *     responses:
 *       201: { description: Created (status is calculated automatically) }
 */
router.get('/items', validate(v.list), ctrl.listItems);
router.post('/items', authorize(GROUPS.STOCK), validate(v.create), ctrl.createItem);

/**
 * @swagger
 * /inventory/items/alerts:
 *   get:
 *     tags: [Inventory]
 *     summary: Items that are LOW STOCK, CRITICAL, OUT OF STOCK or EXPIRED
 *     responses:
 *       200: { description: Alert items }
 */
router.get('/items/alerts', ctrl.alerts);

/**
 * @swagger
 * /inventory/items/{id}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get one item
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Item }
 *   put:
 *     tags: [Inventory]
 *     summary: Update item details (stock quantity changes go through stock movements)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productName: { type: string }
 *               category: { type: string }
 *               minStockLevel: { type: number }
 *               unit: { type: string }
 *               expiryDate: { type: string, format: date }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Inventory]
 *     summary: Delete an item
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Deleted }
 */
router.get('/items/:id', validate(v.getOne), ctrl.getItem);
router.put('/items/:id', authorize(GROUPS.STOCK), validate(v.update), ctrl.updateItem);
router.delete('/items/:id', authorize(GROUPS.STOCK), validate(v.getOne), ctrl.deleteItem);

// ================= MOVEMENTS =================
/**
 * @swagger
 * /inventory/movements:
 *   get:
 *     tags: [Stock Movements]
 *     summary: Stock movement history
 *     parameters:
 *       - { in: query, name: itemId, schema: { type: integer } }
 *       - { in: query, name: departmentId, schema: { type: integer } }
 *       - { in: query, name: type, schema: { type: string, enum: [PURCHASE, TRANSFER_IN, TRANSFER_OUT, PRODUCTION_USAGE, SOLD, WASTED] } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Movements }
 *   post:
 *     tags: [Stock Movements]
 *     summary: Record a stock movement (updates item quantity and status atomically)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemId, quantity, movementType]
 *             properties:
 *               itemId: { type: integer }
 *               quantity: { type: number, example: 10 }
 *               movementType: { type: string, enum: [PURCHASE, TRANSFER_IN, TRANSFER_OUT, PRODUCTION_USAGE, SOLD, WASTED] }
 *     responses:
 *       201: { description: Recorded }
 *       400: { description: Insufficient stock }
 */
router.get('/movements', authorize(GROUPS.STOCK), validate(v.movementList), ctrl.listMovements);
router.post('/movements', authorize(GROUPS.STOCK), validate(v.movementCreate), ctrl.createMovement);

// ================= REQUISITIONS =================
/**
 * @swagger
 * /inventory/requisitions:
 *   get:
 *     tags: [Requisitions]
 *     summary: List requisitions
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [PENDING, APPROVED, REJECTED, FULFILLED] } }
 *       - { in: query, name: priority, schema: { type: string } }
 *       - { in: query, name: departmentId, schema: { type: integer } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Requisitions }
 *   post:
 *     tags: [Requisitions]
 *     summary: Request additional stock (any staff)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemId, quantity]
 *             properties:
 *               itemId: { type: integer }
 *               quantity: { type: number }
 *               priority: { type: string, enum: [LOW, NORMAL, HIGH, URGENT] }
 *               reason: { type: string }
 *               requiredDate: { type: string, format: date }
 *     responses:
 *       201: { description: Submitted }
 */
router.get('/requisitions', validate(v.reqList), ctrl.listRequisitions);
router.post('/requisitions', validate(v.reqCreate), ctrl.createRequisition);

/**
 * @swagger
 * /inventory/requisitions/{id}:
 *   get:
 *     tags: [Requisitions]
 *     summary: Get one requisition
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Requisition }
 */
router.get('/requisitions/:id', validate(v.getOne), ctrl.getRequisition);

/**
 * @swagger
 * /inventory/requisitions/{id}/decision:
 *   patch:
 *     tags: [Requisitions]
 *     summary: Approve or reject a PENDING requisition (stock managers)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decision]
 *             properties:
 *               decision: { type: string, enum: [APPROVED, REJECTED] }
 *     responses:
 *       200: { description: Decision saved }
 */
router.patch('/requisitions/:id/decision', authorize(GROUPS.STOCK), validate(v.reqDecision), ctrl.decideRequisition);

/**
 * @swagger
 * /inventory/requisitions/{id}/fulfill:
 *   post:
 *     tags: [Requisitions]
 *     summary: Fulfil an APPROVED requisition - creates a TRANSFER_IN movement and updates stock
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Fulfilled }
 */
router.post('/requisitions/:id/fulfill', authorize(GROUPS.STOCK), validate(v.getOne), ctrl.fulfillRequisition);

// ================= SUPPLIERS =================
/**
 * @swagger
 * /inventory/suppliers:
 *   get:
 *     tags: [Suppliers]
 *     summary: List suppliers (stock managers)
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: paymentStatus, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Suppliers }
 *   post:
 *     tags: [Suppliers]
 *     summary: Create a supplier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [supplierName]
 *             properties:
 *               supplierName: { type: string }
 *               contactInfo: { type: string }
 *               productsSupplied: { type: string }
 *               paymentStatus: { type: string, example: PENDING }
 *     responses:
 *       201: { description: Created }
 */
router.get('/suppliers', authorize(GROUPS.STOCK), validate(v.supplierList), ctrl.listSuppliers);
router.post('/suppliers', authorize(GROUPS.STOCK), validate(v.supplierCreate), ctrl.createSupplier);

/**
 * @swagger
 * /inventory/suppliers/{id}:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get a supplier
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Supplier }
 *   put:
 *     tags: [Suppliers]
 *     summary: Update a supplier
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               supplierName: { type: string }
 *               contactInfo: { type: string }
 *               productsSupplied: { type: string }
 *               paymentStatus: { type: string }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Suppliers]
 *     summary: Delete a supplier
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Deleted }
 */
router.get('/suppliers/:id', authorize(GROUPS.STOCK), validate(v.getOne), ctrl.getSupplier);
router.put('/suppliers/:id', authorize(GROUPS.STOCK), validate(v.supplierUpdate), ctrl.updateSupplier);
router.delete('/suppliers/:id', authorize(GROUPS.STOCK), validate(v.getOne), ctrl.deleteSupplier);

module.exports = router;