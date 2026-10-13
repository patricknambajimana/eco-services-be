const { query, withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta, WhereBuilder } = require('../utils/pagination');
const { resolveDepartment, canAccessDepartment } = require('../utils/department');
const inventory = require('./inventory.service');

// ================= PRODUCTS =================
const PRODUCT_SELECT = `
  SELECT p.product_id AS "productId", p.department_id AS "departmentId", d.department_name AS "departmentName",
         p.product_name AS "productName", p.category, p.selling_price::float AS "sellingPrice",
         p.cost_price::float AS "costPrice", p.preparation_time AS "preparationTime",
         p.shelf_life AS "shelfLife", p.is_available AS "isAvailable"
    FROM products p JOIN departments d ON d.department_id = p.department_id`;

const getProductOrFail = async (actor, id) => {
    const { rows } = await query(`${PRODUCT_SELECT} WHERE p.product_id = $1`, [id]);
    if (!rows[0]) throw ApiError.notFound('Product not found');
    if (!canAccessDepartment(actor, rows[0].departmentId)) throw ApiError.forbidden('Product belongs to another department');
    return rows[0];
};

const listProducts = async (actor, q) => {
    const { page, limit, offset } = getPagination(q);
    const w = new WhereBuilder();
    const dept = resolveDepartment(actor, q.departmentId);
    if (dept) w.add('p.department_id = ?', dept);
    if (q.category) w.add('p.category ILIKE ?', q.category);
    if (q.isAvailable !== undefined) w.add('p.is_available = ?', q.isAvailable);
    if (q.search) w.add('p.product_name ILIKE ?', `%${q.search}%`);
    const total = await query(`SELECT COUNT(*)::int AS n FROM products p ${w.sql}`, w.params);
    const { rows } = await query(
        `${PRODUCT_SELECT} ${w.sql} ORDER BY p.product_name LIMIT $${w.params.length + 1} OFFSET $${w.params.length + 2}`,
        [...w.params, limit, offset]
    );
    return { rows, meta: buildMeta(page, limit, total.rows[0].n) };
};

const createProduct = async (actor, d) => {
    if (!canAccessDepartment(actor, d.departmentId)) throw ApiError.forbidden('You can only add products to your own department');
    const { rows } = await query(
        `INSERT INTO products (department_id, product_name, category, selling_price, cost_price, preparation_time, shelf_life, is_available)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING product_id`,
        [d.departmentId, d.productName, d.category || null, d.sellingPrice, d.costPrice ?? null, d.preparationTime ?? null, d.shelfLife ?? null, d.isAvailable]
    );
    return getProductOrFail(actor, rows[0].product_id);
};

const updateProduct = async (actor, id, d) => {
    await getProductOrFail(actor, id);
    const map = {
        productName: 'product_name', category: 'category', sellingPrice: 'selling_price', costPrice: 'cost_price',
        preparationTime: 'preparation_time', shelfLife: 'shelf_life', isAvailable: 'is_available',
    };
    const sets = []; const params = [];
    for (const [k, col] of Object.entries(map)) {
        if (d[k] !== undefined) { params.push(d[k]); sets.push(`${col} = $${params.length}`); }
    }
    params.push(id);
    await query(`UPDATE products SET ${sets.join(', ')} WHERE product_id = $${params.length}`, params);
    return getProductOrFail(actor, id);
};

const deleteProduct = async (actor, id) => {
    await getProductOrFail(actor, id);
    await query('DELETE FROM products WHERE product_id = $1', [id]);
};

// ================= RECIPES =================
const RECIPE_SELECT = `
  SELECT r.recipe_id AS "recipeId", r.product_id AS "productId", p.product_name AS "productName",
         p.department_id AS "departmentId", r.recipe_name AS "recipeName",
         r.preparation_steps AS "preparationSteps", r.cooking_time AS "cookingTime",
         r.required_equipment AS "requiredEquipment"
    FROM recipes r JOIN products p ON p.product_id = r.product_id`;

const loadIngredients = async (recipeId) => {
    const { rows } = await query(
        `SELECT ri.item_id AS "itemId", i.product_name AS "itemName", i.unit, ri.quantity_required::float AS "quantityRequired"
       FROM recipe_ingredients ri JOIN inventory_items i ON i.item_id = ri.item_id
      WHERE ri.recipe_id = $1 ORDER BY i.product_name`,
        [recipeId]
    );
    return rows;
};

const getRecipe = async (actor, id) => {
    const { rows } = await query(`${RECIPE_SELECT} WHERE r.recipe_id = $1`, [id]);
    if (!rows[0]) throw ApiError.notFound('Recipe not found');
    if (!canAccessDepartment(actor, rows[0].departmentId)) throw ApiError.forbidden();
    return { ...rows[0], ingredients: await loadIngredients(id) };
};

const listRecipes = async (actor, q) => {
    const { page, limit, offset } = getPagination(q);
    const w = new WhereBuilder();
    const dept = resolveDepartment(actor, null);
    if (dept) w.add('p.department_id = ?', dept);
    if (q.productId) w.add('r.product_id = ?', q.productId);
    if (q.search) w.add('r.recipe_name ILIKE ?', `%${q.search}%`);
    const total = await query(`SELECT COUNT(*)::int AS n FROM recipes r JOIN products p ON p.product_id = r.product_id ${w.sql}`, w.params);
    const { rows } = await query(
        `${RECIPE_SELECT} ${w.sql} ORDER BY r.recipe_name LIMIT $${w.params.length + 1} OFFSET $${w.params.length + 2}`,
        [...w.params, limit, offset]
    );
    return { rows, meta: buildMeta(page, limit, total.rows[0].n) };
};

const replaceIngredients = async (db, recipeId, ingredients) => {
    await db.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);
    for (const ing of ingredients) {
        await db.query(
            `INSERT INTO recipe_ingredients (recipe_id, item_id, quantity_required) VALUES ($1,$2,$3)
       ON CONFLICT (recipe_id, item_id) DO UPDATE SET quantity_required = EXCLUDED.quantity_required`,
            [recipeId, ing.itemId, ing.quantityRequired]
        );
    }
};

const createRecipe = async (actor, d) => {
    await getProductOrFail(actor, d.productId);
    const id = await withTransaction(async (db) => {
        const { rows } = await db.query(
            `INSERT INTO recipes (product_id, recipe_name, preparation_steps, cooking_time, required_equipment)
       VALUES ($1,$2,$3,$4,$5) RETURNING recipe_id`,
            [d.productId, d.recipeName, d.preparationSteps || null, d.cookingTime ?? null, d.requiredEquipment || null]
        );
        await replaceIngredients(db, rows[0].recipe_id, d.ingredients);
        return rows[0].recipe_id;
    });
    return getRecipe(actor, id);
};

const updateRecipe = async (actor, id, d) => {
    await getRecipe(actor, id);
    await withTransaction(async (db) => {
        const map = { recipeName: 'recipe_name', preparationSteps: 'preparation_steps', cookingTime: 'cooking_time', requiredEquipment: 'required_equipment' };
        const sets = []; const params = [];
        for (const [k, col] of Object.entries(map)) {
            if (d[k] !== undefined) { params.push(d[k]); sets.push(`${col} = $${params.length}`); }
        }
        if (sets.length) {
            params.push(id);
            await db.query(`UPDATE recipes SET ${sets.join(', ')} WHERE recipe_id = $${params.length}`, params);
        }
        if (d.ingredients) await replaceIngredients(db, id, d.ingredients);
    });
    return getRecipe(actor, id);
};

const deleteRecipe = async (actor, id) => {
    await getRecipe(actor, id);
    await query('DELETE FROM recipes WHERE recipe_id = $1', [id]);
};

// ================= RESTAURANT TABLES =================
const TABLE_SELECT = `SELECT table_id AS "tableId", table_number AS "tableNumber", capacity, status FROM restaurant_tables`;

const listTables = async (q) => {
    const w = new WhereBuilder();
    if (q.status) w.add('status = ?', q.status);
    const { rows } = await query(`${TABLE_SELECT} ${w.sql} ORDER BY table_number`, w.params);
    return rows;
};

const getTable = async (id) => {
    const { rows } = await query(`${TABLE_SELECT} WHERE table_id = $1`, [id]);
    if (!rows[0]) throw ApiError.notFound('Table not found');
    return rows[0];
};

const createTable = async (d) => {
    const { rows } = await query(
        'INSERT INTO restaurant_tables (table_number, capacity, status) VALUES ($1,$2,$3) RETURNING table_id',
        [d.tableNumber, d.capacity, d.status]
    );
    return getTable(rows[0].table_id);
};

const updateTable = async (id, d) => {
    await getTable(id);
    const map = { tableNumber: 'table_number', capacity: 'capacity', status: 'status' };
    const sets = []; const params = [];
    for (const [k, col] of Object.entries(map)) {
        if (d[k] !== undefined) { params.push(d[k]); sets.push(`${col} = $${params.length}`); }
    }
    params.push(id);
    await query(`UPDATE restaurant_tables SET ${sets.join(', ')} WHERE table_id = $${params.length}`, params);
    return getTable(id);
};

const deleteTable = async (id) => {
    await getTable(id);
    await query('DELETE FROM restaurant_tables WHERE table_id = $1', [id]);
};

// ================= PRODUCTION BATCHES =================
const BATCH_SELECT = `
  SELECT b.batch_id AS "batchId", b.product_id AS "productId", p.product_name AS "productName",
         p.department_id AS "departmentId", b.production_quantity AS "productionQuantity",
         b.production_time AS "productionTime", b.expiry_time AS "expiryTime", b.status,
         b.chef_id AS "chefId", u.full_name AS "chefName"
    FROM production_batches b
    JOIN products p ON p.product_id = b.product_id
    LEFT JOIN users u ON u.user_id = b.chef_id`;

const getBatch = async (actor, id) => {
    const { rows } = await query(`${BATCH_SELECT} WHERE b.batch_id = $1`, [id]);
    if (!rows[0]) throw ApiError.notFound('Production batch not found');
    if (!canAccessDepartment(actor, rows[0].departmentId)) throw ApiError.forbidden();
    return rows[0];
};

const listBatches = async (actor, q) => {
    const { page, limit, offset } = getPagination(q);
    const w = new WhereBuilder();
    const dept = resolveDepartment(actor, null);
    if (dept) w.add('p.department_id = ?', dept);
    if (q.status) w.add('b.status = ?', q.status);
    if (q.productId) w.add('b.product_id = ?', q.productId);
    const total = await query(`SELECT COUNT(*)::int AS n FROM production_batches b JOIN products p ON p.product_id = b.product_id ${w.sql}`, w.params);
    const { rows } = await query(
        `${BATCH_SELECT} ${w.sql} ORDER BY b.production_time DESC LIMIT $${w.params.length + 1} OFFSET $${w.params.length + 2}`,
        [...w.params, limit, offset]
    );
    return { rows, meta: buildMeta(page, limit, total.rows[0].n) };
};

const createBatch = async (actor, d) => {
    const product = await getProductOrFail(actor, d.productId);
    let expiry = d.expiryTime || null;
    if (!expiry && product.shelfLife) {
        expiry = new Date(Date.now() + product.shelfLife * 24 * 3600 * 1000);
    }
    const { rows } = await query(
        `INSERT INTO production_batches (product_id, production_quantity, expiry_time, chef_id)
     VALUES ($1,$2,$3,$4) RETURNING batch_id`,
        [d.productId, d.productionQuantity, expiry, d.chefId ?? actor.id]
    );
    return getBatch(actor, rows[0].batch_id);
};

const NEXT_BATCH_STATUS = { PLANNED: ['IN_PROGRESS'], IN_PROGRESS: ['COMPLETED'], COMPLETED: ['EXPIRED'], EXPIRED: [] };

/**
 * PLANNED -> IN_PROGRESS -> COMPLETED -> EXPIRED.
 * When a batch starts, the ingredients of the product's recipe are deducted from stock
 * as PRODUCTION_USAGE movements (ingredient qty x batch quantity).
 */
const updateBatchStatus = async (actor, id, status) => {
    const batch = await getBatch(actor, id);
    if (!NEXT_BATCH_STATUS[batch.status].includes(status)) {
        throw ApiError.badRequest(`Cannot move batch from ${batch.status} to ${status}`);
    }
    await withTransaction(async (db) => {
        if (status === 'IN_PROGRESS') {
            const { rows } = await db.query(
                `SELECT ri.item_id, ri.quantity_required FROM recipes r
           JOIN recipe_ingredients ri ON ri.recipe_id = r.recipe_id
          WHERE r.product_id = $1`,
                [batch.productId]
            );
            for (const ing of rows) {
                await inventory.applyMovement(db, {
                    itemId: ing.item_id,
                    quantity: Number(ing.quantity_required) * batch.productionQuantity,
                    movementType: 'PRODUCTION_USAGE',
                    userId: actor.id,
                });
            }
        }
        await db.query('UPDATE production_batches SET status = $1 WHERE batch_id = $2', [status, id]);
    });
    return getBatch(actor, id);
};

module.exports = {
    listProducts, getProduct: getProductOrFail, createProduct, updateProduct, deleteProduct,
    listRecipes, getRecipe, createRecipe, updateRecipe, deleteRecipe,
    listTables, getTable, createTable, updateTable, deleteTable,
    listBatches, getBatch, createBatch, updateBatchStatus,
};