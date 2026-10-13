const { query, withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta, WhereBuilder } = require('../utils/pagination');
const { resolveDepartment, canAccessDepartment } = require('../utils/department');

const ITEM_SELECT = `
  SELECT i.item_id AS "itemId", i.department_id AS "departmentId", d.department_name AS "departmentName",
         i.product_name AS "productName", i.category, i.quantity::float AS quantity,
         i.min_stock_level::float AS "minStockLevel", i.unit, i.expiry_date AS "expiryDate", i.status
    FROM inventory_items i JOIN departments d ON d.department_id = i.department_id`;

/** Derive the stock status from quantity, minimum level and expiry date. */
const computeStatus = (quantity, minLevel, expiryDate) => {
    if (expiryDate && new Date(expiryDate) < new Date(new Date().toDateString())) return 'EXPIRED';
    const q = Number(quantity);
    const min = Number(minLevel ?? 0);
    if (q <= 0) return 'OUT OF STOCK';
    if (q <= min * 0.5) return 'CRITICAL';
    if (q <= min) return 'LOW STOCK';
    return 'AVAILABLE';
};

const refreshStatus = async (db, itemId) => {
    const { rows } = await db.query(
        `UPDATE inventory_items
        SET status = CASE
          WHEN expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN quantity <= 0 THEN 'OUT OF STOCK'
          WHEN quantity <= COALESCE(min_stock_level,0) * 0.5 THEN 'CRITICAL'
          WHEN quantity <= COALESCE(min_stock_level,0) THEN 'LOW STOCK'
          ELSE 'AVAILABLE' END
      WHERE item_id = $1 RETURNING status`,
        [itemId]
    );
    return rows[0]?.status;
};

const getItemOrFail = async (actor, id, db = { query }) => {
    const { rows } = await db.query(`${ITEM_SELECT} WHERE i.item_id = $1`, [id]);
    if (!rows[0]) throw ApiError.notFound('Inventory item not found');
    if (!canAccessDepartment(actor, rows[0].departmentId)) throw ApiError.forbidden('Item belongs to another department');
    return rows[0];
};

// ---------- items ----------
const listItems = async (actor, q) => {
    const { page, limit, offset } = getPagination(q);
    const w = new WhereBuilder();
    const dept = resolveDepartment(actor, q.departmentId);
    if (dept) w.add('i.department_id = ?', dept);
    if (q.category) w.add('i.category ILIKE ?', q.category);
    if (q.status) w.add('i.status = ?', q.status);
    if (q.search) w.add('i.product_name ILIKE ?', `%${q.search}%`);
    const total = await query(`SELECT COUNT(*)::int AS n FROM inventory_items i ${w.sql}`, w.params);
    const { rows } = await query(
        `${ITEM_SELECT} ${w.sql} ORDER BY i.product_name LIMIT $${w.params.length + 1} OFFSET $${w.params.length + 2}`,
        [...w.params, limit, offset]
    );
    return { rows, meta: buildMeta(page, limit, total.rows[0].n) };
};

const getItem = (actor, id) => getItemOrFail(actor, id);

const createItem = async (actor, d) => {
    if (!canAccessDepartment(actor, d.departmentId)) throw ApiError.forbidden('You can only add items to your own department');
    const status = computeStatus(d.quantity, d.minStockLevel, d.expiryDate);
    const { rows } = await query(
        `INSERT INTO inventory_items (department_id, product_name, category, quantity, min_stock_level, unit, expiry_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING item_id`,
        [d.departmentId, d.productName, d.category, d.quantity, d.minStockLevel, d.unit, d.expiryDate || null, status]
    );
    return getItemOrFail(actor, rows[0].item_id);
};

const updateItem = async (actor, id, d) => {
    await getItemOrFail(actor, id);
    const map = { productName: 'product_name', category: 'category', minStockLevel: 'min_stock_level', unit: 'unit', expiryDate: 'expiry_date' };
    const sets = []; const params = [];
    for (const [k, col] of Object.entries(map)) {
        if (d[k] !== undefined) { params.push(d[k]); sets.push(`${col} = $${params.length}`); }
    }
    params.push(id);
    await withTransaction(async (db) => {
        await db.query(`UPDATE inventory_items SET ${sets.join(', ')} WHERE item_id = $${params.length}`, params);
        await refreshStatus(db, id);
    });
    return getItemOrFail(actor, id);
};

const deleteItem = async (actor, id) => {
    await getItemOrFail(actor, id);
    await query('DELETE FROM inventory_items WHERE item_id = $1', [id]);
};

/** Items that need attention: low / critical / out of stock / expired. */
const alerts = async (actor, q) => {
    const w = new WhereBuilder();
    const dept = resolveDepartment(actor, q.departmentId);
    if (dept) w.add('i.department_id = ?', dept);
    w.addRaw(`i.status <> 'AVAILABLE'`);
    const { rows } = await query(`${ITEM_SELECT} ${w.sql} ORDER BY i.status, i.product_name`, w.params);
    return rows;
};

// ---------- stock movements ----------
const INCREASE = ['PURCHASE', 'TRANSFER_IN'];

/**
 * Applies a stock movement atomically (row-locks the item so concurrent
 * movements can never drive the quantity negative).
 */
const applyMovement = async (db, { itemId, quantity, movementType, userId }) => {
    const { rows } = await db.query('SELECT item_id, department_id, quantity FROM inventory_items WHERE item_id = $1 FOR UPDATE', [itemId]);
    const item = rows[0];
    if (!item) throw ApiError.notFound('Inventory item not found');

    const delta = INCREASE.includes(movementType) ? Number(quantity) : -Number(quantity);
    if (Number(item.quantity) + delta < 0) {
        throw ApiError.badRequest(`Insufficient stock: only ${Number(item.quantity)} available`);
    }
    await db.query('UPDATE inventory_items SET quantity = quantity + $1 WHERE item_id = $2', [delta, itemId]);
    const mv = await db.query(
        `INSERT INTO stock_movements (item_id, department_id, quantity, movement_type, performed_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING movement_id`,
        [itemId, item.department_id, quantity, movementType, userId]
    );
    const status = await refreshStatus(db, itemId);
    return { movementId: mv.rows[0].movement_id, itemId, newStatus: status };
};

const createMovement = async (actor, d) => {
    await getItemOrFail(actor, d.itemId);
    const result = await withTransaction((db) => applyMovement(db, { ...d, userId: actor.id }));
    const item = await getItemOrFail(actor, d.itemId);
    return { movementId: result.movementId, item };
};

const listMovements = async (actor, q) => {
    const { page, limit, offset } = getPagination(q);
    const w = new WhereBuilder();
    const dept = resolveDepartment(actor, q.departmentId);
    if (dept) w.add('m.department_id = ?', dept);
    if (q.itemId) w.add('m.item_id = ?', q.itemId);
    if (q.type) w.add('m.movement_type = ?', q.type);
    if (q.from) w.add('m.movement_date >= ?', q.from);
    if (q.to) w.add(`m.movement_date < (?::date + 1)`, q.to);
    const total = await query(`SELECT COUNT(*)::int AS n FROM stock_movements m ${w.sql}`, w.params);
    const { rows } = await query(
        `SELECT m.movement_id AS "movementId", m.movement_date AS "date", i.product_name AS "productName",
            m.item_id AS "itemId", m.quantity::float AS quantity, m.movement_type AS "movementType",
            d.department_name AS "departmentName", u.full_name AS "performedBy"
       FROM stock_movements m
       JOIN inventory_items i ON i.item_id = m.item_id
       JOIN departments d ON d.department_id = m.department_id
       LEFT JOIN users u ON u.user_id = m.performed_by
       ${w.sql} ORDER BY m.movement_date DESC LIMIT $${w.params.length + 1} OFFSET $${w.params.length + 2}`,
        [...w.params, limit, offset]
    );
    return { rows, meta: buildMeta(page, limit, total.rows[0].n) };
};

// ---------- requisitions ----------
const REQ_SELECT = `
  SELECT r.requisition_id AS "requisitionId", r.department_id AS "departmentId", d.department_name AS "departmentName",
         r.item_id AS "itemId", i.product_name AS "productName", r.quantity::float AS quantity, r.priority, r.reason,
         r.required_date AS "requiredDate", r.status, rb.full_name AS "requestedBy", ab.full_name AS "approvedBy",
         r.created_at AS "createdAt"
    FROM inventory_requisitions r
    JOIN departments d ON d.department_id = r.department_id
    JOIN inventory_items i ON i.item_id = r.item_id
    LEFT JOIN users rb ON rb.user_id = r.requested_by
    LEFT JOIN users ab ON ab.user_id = r.approved_by`;

const getRequisition = async (actor, id) => {
    const { rows } = await query(`${REQ_SELECT} WHERE r.requisition_id = $1`, [id]);
    if (!rows[0]) throw ApiError.notFound('Requisition not found');
    if (!canAccessDepartment(actor, rows[0].departmentId)) throw ApiError.forbidden();
    return rows[0];
};

const listRequisitions = async (actor, q) => {
    const { page, limit, offset } = getPagination(q);
    const w = new WhereBuilder();
    const dept = resolveDepartment(actor, q.departmentId);
    if (dept) w.add('r.department_id = ?', dept);
    if (q.status) w.add('r.status = ?', q.status);
    if (q.priority) w.add('r.priority = ?', q.priority);
    const total = await query(`SELECT COUNT(*)::int AS n FROM inventory_requisitions r ${w.sql}`, w.params);
    const { rows } = await query(
        `${REQ_SELECT} ${w.sql} ORDER BY r.created_at DESC LIMIT $${w.params.length + 1} OFFSET $${w.params.length + 2}`,
        [...w.params, limit, offset]
    );
    return { rows, meta: buildMeta(page, limit, total.rows[0].n) };
};

const createRequisition = async (actor, d) => {
    const item = await getItemOrFail(actor, d.itemId);
    const { rows } = await query(
        `INSERT INTO inventory_requisitions (department_id, item_id, quantity, priority, reason, required_date, requested_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING requisition_id`,
        [item.departmentId, d.itemId, d.quantity, d.priority, d.reason || null, d.requiredDate || null, actor.id]
    );
    return getRequisition(actor, rows[0].requisition_id);
};

/** PENDING -> APPROVED | REJECTED */
const decideRequisition = async (actor, id, decision) => {
    const req = await getRequisition(actor, id);
    if (req.status !== 'PENDING') throw ApiError.badRequest(`Requisition is already ${req.status}`);
    await query('UPDATE inventory_requisitions SET status = $1, approved_by = $2 WHERE requisition_id = $3', [decision, actor.id, id]);
    return getRequisition(actor, id);
};

/** APPROVED -> FULFILLED: creates a TRANSFER_IN stock movement and updates inventory. */
const fulfillRequisition = async (actor, id) => {
    const req = await getRequisition(actor, id);
    if (req.status !== 'APPROVED') throw ApiError.badRequest('Only APPROVED requisitions can be fulfilled');
    await withTransaction(async (db) => {
        await applyMovement(db, { itemId: req.itemId, quantity: req.quantity, movementType: 'TRANSFER_IN', userId: actor.id });
        await db.query(`UPDATE inventory_requisitions SET status = 'FULFILLED' WHERE requisition_id = $1`, [id]);
    });
    return getRequisition(actor, id);
};

// ---------- suppliers ----------
const SUPPLIER_SELECT = `SELECT supplier_id AS "supplierId", supplier_name AS "supplierName", contact_info AS "contactInfo",
  products_supplied AS "productsSupplied", payment_status AS "paymentStatus" FROM suppliers`;

const listSuppliers = async (q) => {
    const { page, limit, offset } = getPagination(q);
    const w = new WhereBuilder();
    if (q.search) w.add('(supplier_name ILIKE ? OR products_supplied ILIKE ?)', `%${q.search}%`);
    if (q.paymentStatus) w.add('payment_status = ?', q.paymentStatus);
    const total = await query(`SELECT COUNT(*)::int AS n FROM suppliers ${w.sql}`, w.params);
    const { rows } = await query(
        `${SUPPLIER_SELECT} ${w.sql} ORDER BY supplier_name LIMIT $${w.params.length + 1} OFFSET $${w.params.length + 2}`,
        [...w.params, limit, offset]
    );
    return { rows, meta: buildMeta(page, limit, total.rows[0].n) };
};

const getSupplier = async (id) => {
    const { rows } = await query(`${SUPPLIER_SELECT} WHERE supplier_id = $1`, [id]);
    if (!rows[0]) throw ApiError.notFound('Supplier not found');
    return rows[0];
};

const createSupplier = async (d) => {
    const { rows } = await query(
        `INSERT INTO suppliers (supplier_name, contact_info, products_supplied, payment_status)
     VALUES ($1,$2,$3,$4) RETURNING supplier_id`,
        [d.supplierName, d.contactInfo || null, d.productsSupplied || null, d.paymentStatus]
    );
    return getSupplier(rows[0].supplier_id);
};

const updateSupplier = async (id, d) => {
    await getSupplier(id);
    const map = { supplierName: 'supplier_name', contactInfo: 'contact_info', productsSupplied: 'products_supplied', paymentStatus: 'payment_status' };
    const sets = []; const params = [];
    for (const [k, col] of Object.entries(map)) {
        if (d[k] !== undefined) { params.push(d[k]); sets.push(`${col} = $${params.length}`); }
    }
    params.push(id);
    await query(`UPDATE suppliers SET ${sets.join(', ')} WHERE supplier_id = $${params.length}`, params);
    return getSupplier(id);
};

const deleteSupplier = async (id) => {
    await getSupplier(id);
    await query('DELETE FROM suppliers WHERE supplier_id = $1', [id]);
};

module.exports = {
    computeStatus, applyMovement,
    listItems, getItem, createItem, updateItem, deleteItem, alerts,
    createMovement, listMovements,
    listRequisitions, getRequisition, createRequisition, decideRequisition, fulfillRequisition,
    listSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier,
};