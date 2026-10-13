const { query, withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta, WhereBuilder } = require('../utils/pagination');
const { resolveDepartment, canAccessDepartment, isGlobalUser } = require('../utils/department');

// ================= CUSTOMERS =================
const CUSTOMER_SELECT = `SELECT customer_id AS "customerId", name, phone, address, created_at AS "createdAt" FROM customers`;

const listCustomers = async (q) => {
    const { page, limit, offset } = getPagination(q);
    const w = new WhereBuilder();
    if (q.search) w.add('(name ILIKE ? OR phone ILIKE ?)', `%${q.search}%`);
    const total = await query(`SELECT COUNT(*)::int AS n FROM customers ${w.sql}`, w.params);
    const { rows } = await query(
        `${CUSTOMER_SELECT} ${w.sql} ORDER BY name LIMIT $${w.params.length + 1} OFFSET $${w.params.length + 2}`,
        [...w.params, limit, offset]
    );
    return { rows, meta: buildMeta(page, limit, total.rows[0].n) };
};

const getCustomer = async (id) => {
    const { rows } = await query(`${CUSTOMER_SELECT} WHERE customer_id = $1`, [id]);
    if (!rows[0]) throw ApiError.notFound('Customer not found');
    return rows[0];
};

const createCustomer = async (d) => {
    const { rows } = await query(
        'INSERT INTO customers (name, phone, address) VALUES ($1,$2,$3) RETURNING customer_id',
        [d.name, d.phone || null, d.address || null]
    );
    return getCustomer(rows[0].customer_id);
};

const updateCustomer = async (id, d) => {
    await getCustomer(id);
    const sets = []; const params = [];
    for (const k of ['name', 'phone', 'address']) {
        if (d[k] !== undefined) { params.push(d[k]); sets.push(`${k} = $${params.length}`); }
    }
    params.push(id);
    await query(`UPDATE customers SET ${sets.join(', ')} WHERE customer_id = $${params.length}`, params);
    return getCustomer(id);
};

const deleteCustomer = async (id) => {
    await getCustomer(id);
    await query('DELETE FROM customers WHERE customer_id = $1', [id]);
};

// ================= ORDERS =================
const ORDER_SELECT = `
  SELECT o.order_id AS "orderId", o.department_id AS "departmentId", d.department_name AS "departmentName",
         o.customer_id AS "customerId", c.name AS "customerName", o.order_type AS "orderType", o.status,
         o.total_amount::float AS "totalAmount", o.payment_status AS "paymentStatus",
         o.created_by AS "createdById", u.full_name AS "createdBy", o.created_at AS "createdAt"
    FROM orders o
    JOIN departments d ON d.department_id = o.department_id
    LEFT JOIN customers c ON c.customer_id = o.customer_id
    LEFT JOIN users u ON u.user_id = o.created_by`;

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED'];

const getOrder = async (actor, id) => {
    const { rows } = await query(`${ORDER_SELECT} WHERE o.order_id = $1`, [id]);
    if (!rows[0]) throw ApiError.notFound('Order not found');
    if (!canAccessDepartment(actor, rows[0].departmentId)) throw ApiError.forbidden('Order belongs to another department');
    const items = await query(
        `SELECT oi.order_item_id AS "orderItemId", oi.product_id AS "productId", p.product_name AS "productName",
            oi.quantity, oi.unit_price::float AS "unitPrice", (oi.quantity * oi.unit_price)::float AS "lineTotal", oi.notes
       FROM order_items oi JOIN products p ON p.product_id = oi.product_id
      WHERE oi.order_id = $1 ORDER BY oi.order_item_id`,
        [id]
    );
    const payments = await query(
        `SELECT p.payment_id AS "paymentId", p.amount::float AS amount, p.payment_method AS "paymentMethod",
            p.payment_status AS "paymentStatus", u.full_name AS "processedBy", p.processed_at AS "processedAt"
       FROM payments p LEFT JOIN users u ON u.user_id = p.processed_by
      WHERE p.order_id = $1 ORDER BY p.processed_at`,
        [id]
    );
    return { ...rows[0], items: items.rows, payments: payments.rows };
};

const listOrders = async (actor, q) => {
    const { page, limit, offset } = getPagination(q);
    const w = new WhereBuilder();
    const dept = resolveDepartment(actor, q.departmentId);
    if (dept) w.add('o.department_id = ?', dept);
    if (q.status) w.add('o.status = ?', q.status);
    if (q.paymentStatus) w.add('o.payment_status = ?', q.paymentStatus);
    if (q.customerId) w.add('o.customer_id = ?', q.customerId);
    if (q.from) w.add('o.created_at >= ?', q.from);
    if (q.to) w.add('o.created_at < (?::date + 1)', q.to);
    const total = await query(`SELECT COUNT(*)::int AS n FROM orders o ${w.sql}`, w.params);
    const { rows } = await query(
        `${ORDER_SELECT} ${w.sql} ORDER BY o.created_at DESC LIMIT $${w.params.length + 1} OFFSET $${w.params.length + 2}`,
        [...w.params, limit, offset]
    );
    return { rows, meta: buildMeta(page, limit, total.rows[0].n) };
};

/**
 * Creates an order with its items in one transaction.
 * Prices are ALWAYS read from the products table - never trusted from the client.
 */
const createOrder = async (actor, d) => {
    const departmentId = isGlobalUser(actor) ? d.departmentId : actor.departmentId;
    if (!departmentId) throw ApiError.badRequest('departmentId is required');

    const orderId = await withTransaction(async (db) => {
        const ids = [...new Set(d.items.map((i) => i.productId))];
        const { rows: products } = await db.query(
            'SELECT product_id, department_id, selling_price, is_available, product_name FROM products WHERE product_id = ANY($1)',
            [ids]
        );
        const byId = new Map(products.map((p) => [p.product_id, p]));

        let total = 0;
        for (const it of d.items) {
            const p = byId.get(it.productId);
            if (!p) throw ApiError.badRequest(`Product ${it.productId} does not exist`);
            if (p.department_id !== Number(departmentId)) throw ApiError.badRequest(`"${p.product_name}" does not belong to this department`);
            if (!p.is_available) throw ApiError.badRequest(`"${p.product_name}" is currently unavailable`);
            total += Number(p.selling_price) * it.quantity;
        }

        if (d.customerId) {
            const c = await db.query('SELECT 1 FROM customers WHERE customer_id = $1', [d.customerId]);
            if (!c.rowCount) throw ApiError.badRequest('Customer does not exist');
        }

        const { rows } = await db.query(
            `INSERT INTO orders (customer_id, department_id, order_type, total_amount, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING order_id`,
            [d.customerId || null, departmentId, d.orderType, total.toFixed(2), actor.id]
        );
        for (const it of d.items) {
            await db.query(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price, notes) VALUES ($1,$2,$3,$4,$5)',
                [rows[0].order_id, it.productId, it.quantity, byId.get(it.productId).selling_price, it.notes || null]
            );
        }
        return rows[0].order_id;
    });
    return getOrder(actor, orderId);
};

/** Status may only move forward one step at a time: PENDING -> CONFIRMED -> ... -> COMPLETED */
const updateStatus = async (actor, id, status) => {
    const order = await getOrder(actor, id);
    const cur = STATUS_FLOW.indexOf(order.status);
    const next = STATUS_FLOW.indexOf(status);
    const skipDelivery = order.orderType !== 'DELIVERY' && order.status === 'READY' && status === 'COMPLETED';
    if (next !== cur + 1 && !skipDelivery) {
        throw ApiError.badRequest(`Invalid status change: ${order.status} -> ${status}. Next allowed: ${STATUS_FLOW[cur + 1] || 'none'}`);
    }
    await query('UPDATE orders SET status = $1 WHERE order_id = $2', [status, id]);
    return getOrder(actor, id);
};

const deleteOrder = async (actor, id) => {
    const order = await getOrder(actor, id);
    if (order.status !== 'PENDING' || order.payments.length) {
        throw ApiError.badRequest('Only PENDING orders without payments can be deleted');
    }
    await query('DELETE FROM orders WHERE order_id = $1', [id]);
};

module.exports = {
    listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
    listOrders, getOrder, createOrder, updateStatus, deleteOrder,
};