const router = require('express').Router();
const ctrl = require('../controllers/product.controller');
const v = require('../validators/product.validator');
const { idParam } = require('../validators/common');
const validate = require('../middlewares/validate');
const { authorize } = require('../middlewares/rbac');
const { GROUPS } = require('../constants/roles');

const idOnly = validate({ params: idParam() });

/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Product catalog (Restaurant menu, Bakery and Decoration products)
 *   - name: Recipes
 *     description: Recipes and ingredients
 *   - name: Restaurant Tables
 *     description: Table management
 *   - name: Production
 *     description: Bakery production batches
 */

// ================= PRODUCTS =================
/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List products (scoped to your department unless admin/manager)
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: departmentId, schema: { type: integer } }
 *       - { in: query, name: category, schema: { type: string } }
 *       - { in: query, name: isAvailable, schema: { type: boolean } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Products }
 *   post:
 *     tags: [Products]
 *     summary: Add a product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [departmentId, productName, sellingPrice]
 *             properties:
 *               departmentId: { type: integer, example: 2 }
 *               productName: { type: string, example: Croissant }
 *               category: { type: string, example: Pastry }
 *               sellingPrice: { type: number, example: 1500 }
 *               costPrice: { type: number, example: 600 }
 *               preparationTime: { type: integer, description: minutes }
 *               shelfLife: { type: integer, description: days }
 *               isAvailable: { type: boolean }
 *     responses:
 *       201: { description: Created }
 */
router.get('/products', validate(v.list), ctrl.listProducts);
router.post('/products', authorize(GROUPS.PRODUCT_EDITORS), validate(v.create), ctrl.createProduct);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a product
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Product }
 *   put:
 *     tags: [Products]
 *     summary: Update a product (price, availability, ...)
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
 *               sellingPrice: { type: number }
 *               costPrice: { type: number }
 *               preparationTime: { type: integer }
 *               shelfLife: { type: integer }
 *               isAvailable: { type: boolean }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Deleted }
 */
router.get('/products/:id', idOnly, ctrl.getProduct);
router.put('/products/:id', authorize(GROUPS.PRODUCT_EDITORS), validate(v.update), ctrl.updateProduct);
router.delete('/products/:id', authorize(GROUPS.PRODUCT_EDITORS), idOnly, ctrl.deleteProduct);

// ================= RECIPES =================
/**
 * @swagger
 * /recipes:
 *   get:
 *     tags: [Recipes]
 *     summary: List recipes
 *     parameters:
 *       - { in: query, name: productId, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Recipes }
 *   post:
 *     tags: [Recipes]
 *     summary: Create a recipe with ingredients (chef leaders / managers)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, recipeName]
 *             properties:
 *               productId: { type: integer }
 *               recipeName: { type: string }
 *               preparationSteps: { type: string }
 *               cookingTime: { type: integer }
 *               requiredEquipment: { type: string }
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId: { type: integer }
 *                     quantityRequired: { type: number }
 *     responses:
 *       201: { description: Created }
 */
router.get('/recipes', validate(v.recipeList), ctrl.listRecipes);
router.post('/recipes', authorize(GROUPS.RECIPE_EDITORS), validate(v.recipeCreate), ctrl.createRecipe);

/**
 * @swagger
 * /recipes/{id}:
 *   get:
 *     tags: [Recipes]
 *     summary: Get a recipe with its ingredients
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Recipe }
 *   put:
 *     tags: [Recipes]
 *     summary: Update a recipe (sending `ingredients` replaces the whole list)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recipeName: { type: string }
 *               preparationSteps: { type: string }
 *               cookingTime: { type: integer }
 *               requiredEquipment: { type: string }
 *               ingredients: { type: array, items: { type: object } }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Recipes]
 *     summary: Delete a recipe
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Deleted }
 */
router.get('/recipes/:id', idOnly, ctrl.getRecipe);
router.put('/recipes/:id', authorize(GROUPS.RECIPE_EDITORS), validate(v.recipeUpdate), ctrl.updateRecipe);
router.delete('/recipes/:id', authorize(GROUPS.RECIPE_EDITORS), idOnly, ctrl.deleteRecipe);

// ================= RESTAURANT TABLES =================
/**
 * @swagger
 * /tables:
 *   get:
 *     tags: [Restaurant Tables]
 *     summary: List restaurant tables and their status
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [AVAILABLE, OCCUPIED, RESERVED, CLEANING] } }
 *     responses:
 *       200: { description: Tables }
 *   post:
 *     tags: [Restaurant Tables]
 *     summary: Add a table
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tableNumber, capacity]
 *             properties:
 *               tableNumber: { type: string, example: T1 }
 *               capacity: { type: integer, example: 4 }
 *               status: { type: string }
 *     responses:
 *       201: { description: Created }
 */
router.get('/tables', validate(v.tableList), ctrl.listTables);
router.post('/tables', authorize(GROUPS.TABLE_MANAGERS), validate(v.tableCreate), ctrl.createTable);

/**
 * @swagger
 * /tables/{id}:
 *   get:
 *     tags: [Restaurant Tables]
 *     summary: Get a table
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Table }
 *   put:
 *     tags: [Restaurant Tables]
 *     summary: Update a table / change its status (reserve, occupy, clean)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableNumber: { type: string }
 *               capacity: { type: integer }
 *               status: { type: string }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Restaurant Tables]
 *     summary: Delete a table (admins)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Deleted }
 */
router.get('/tables/:id', idOnly, ctrl.getTable);
router.put('/tables/:id', authorize(GROUPS.TABLE_MANAGERS), validate(v.tableUpdate), ctrl.updateTable);
router.delete('/tables/:id', authorize(GROUPS.ADMINS), idOnly, ctrl.deleteTable);

// ================= PRODUCTION BATCHES =================
/**
 * @swagger
 * /production/batches:
 *   get:
 *     tags: [Production]
 *     summary: List production batches
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [PLANNED, IN_PROGRESS, COMPLETED, EXPIRED] } }
 *       - { in: query, name: productId, schema: { type: integer } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Batches }
 *   post:
 *     tags: [Production]
 *     summary: Plan a production batch (expiry defaults to product shelf life)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, productionQuantity]
 *             properties:
 *               productId: { type: integer }
 *               productionQuantity: { type: integer, example: 40 }
 *               expiryTime: { type: string, format: date-time }
 *               chefId: { type: integer }
 *     responses:
 *       201: { description: Planned }
 */
router.get('/production/batches', authorize(GROUPS.PRODUCTION), validate(v.batchList), ctrl.listBatches);
router.post('/production/batches', authorize(GROUPS.PRODUCTION), validate(v.batchCreate), ctrl.createBatch);

/**
 * @swagger
 * /production/batches/{id}:
 *   get:
 *     tags: [Production]
 *     summary: Get a batch
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Batch }
 */
router.get('/production/batches/:id', authorize(GROUPS.PRODUCTION), idOnly, ctrl.getBatch);

/**
 * @swagger
 * /production/batches/{id}/status:
 *   patch:
 *     tags: [Production]
 *     summary: Advance a batch PLANNED -> IN_PROGRESS -> COMPLETED -> EXPIRED (starting a batch deducts recipe ingredients from stock)
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
 *               status: { type: string, enum: [IN_PROGRESS, COMPLETED, EXPIRED] }
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Invalid transition or insufficient stock }
 */
router.patch('/production/batches/:id/status', authorize(GROUPS.PRODUCTION), validate(v.batchStatus), ctrl.updateBatchStatus);

module.exports = router;