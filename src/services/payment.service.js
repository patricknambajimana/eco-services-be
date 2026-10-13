const { query, withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta, WhereBuilder } = require('../utils/pagination');
const { resolveDepartment, canAccessDepartment } = require('../utils/department');

const PAYMENT_SELECT = `
  SELECT p.payment_id AS "paymentId", p.order_id AS "orderId", o.department_id AS "departmentId",
         p.amount::float AS amount, p.payment_method AS "paymentMethod", p.payment_status AS "paymentStatus",
         u.full_name AS "processedBy", p.processed_at AS "processedAt"
    FROM payments p
    JOIN orders o ON o.order_id = p.order_id
    LEFT JOIN users u ON u.user_id = p.processed_by`;

const getPayment = async (actor, id) => {
    const { rows } = await query(`${PAYMENT_SELECT} WHERE p.payment_id = $1`, [id]);
    if (!rows[0]) throw ApiError.notFound('Payment not found');
    if (!canAccessDepartment(actor, rows[0].departmentId)) throw ApiError.forbidden();
    return rows[0];
};

const listPayments = async (actor, q) => {
    const { page, limit, offset } = getPagination(q);
    const w = new WhereBuilder();
    const dept = resolveDepartment(actor, q.departmentId);
    if (dept) w.add('o.department_id = ?', dept);
    if (q.orderId) w.add('p.order_id = ?', q.orderId);
    if (q.method) w.add('p.payment_method = ?', q.method);
    if (q.from) w.add('p.processed_at >= ?', q.from);
    if (q.to) w.add('p.processed_at < (?::date + 1)', q.to);
    const total = await query(`SELECT COUNT(*)::int AS n FROM payments p JOIN orders o ON o.order_id = p.order_id ${w.sql}`, w.params);
    const { rows } = await query(
        `${PAYMENT_SELECT} ${w.sql} ORDER BY p.processed_at DESC LIMIT $${w.params.length + 1} OFFSET $${w.params.length + 2}`,
        [...w.params, limit, offset]
    );
    return { rows, meta: buildMeta(page, limit, total.rows[0].n) };
};

/** Recalculates the order's payment_status from its successful payments. */
const syncOrderPayment = async (db, orderId) => {
    const { rows } = await db.query(
        `SELECT o.total_amount, COALESCE(SUM(p.amount) FILTER (WHERE p.payment_status = 'SUCCESSFUL'), 0) AS paid
       FROM orders o LEFT JOIN payments p ON p.order_id = o.order_id
      WHERE o.order_id = $1 GROUP BY o.order_id`,
        [orderId]
    );
    const total = Number(rows[0].total_amount);
    const paid = Number(rows[0].paid);
    const status = paid <= 0 ? 'PENDING' : paid >= total ? 'PAID' : 'PARTIAL';
    await db.query('UPDATE orders SET payment_status = $1 WHERE order_id = $2', [status, orderId]);
    return { status, paid, total };
};

const createPayment = async (actor, d) => {
    const id = await withTransaction(async (db) => {
        const { rows } = await db.query('SELECT order_id, department_id, total_amount FROM orders WHERE order_id = $1 FOR UPDATE', [d.orderId]);
        const order = rows[0];
        if (!order) throw ApiError.notFound('Order not found');
        if (!canAccessDepartment(actor, order.department_id)) throw ApiError.forbidden('Order belongs to another department');

        const sync = await db.query(
            `SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE order_id = $1 AND payment_status = 'SUCCESSFUL'`,
            [d.orderId]
        );
        const due = Number(order.total_amount) - Number(sync.rows[0].paid);
        if (due <= 0) throw ApiError.badRequest('This order is already fully paid');
        if (d.amount > due + 0.001) throw ApiError.badRequest(`Amount exceeds the balance due (${due.toFixed(2)})`);

        const pay = await db.query(
            `INSERT INTO payments (order_id, amount, payment_method, payment_status, processed_by)
       VALUES ($1,$2,$3,'SUCCESSFUL',$4) RETURNING payment_id`,
            [d.orderId, d.amount, d.paymentMethod, actor.id]
        );
        await syncOrderPayment(db, d.orderId);
        return pay.rows[0].payment_id;
    });
    return getPayment(actor, id);
};

/** Marks a payment as REFUNDED and re-evaluates the order's payment status. */
const refundPayment = async (actor, id) => {
    const pay = await getPayment(actor, id);
    if (pay.paymentStatus !== 'SUCCESSFUL') throw ApiError.badRequest(`Cannot refund a ${pay.paymentStatus} payment`);
    await withTransaction(async (db) => {
        await db.query(`UPDATE payments SET payment_status = 'REFUNDED' WHERE payment_id = $1`, [id]);
        await syncOrderPayment(db, pay.orderId);
    });
    return getPayment(actor, id);
};

/** Printable receipt data for an order. */
const getReceipt = async (actor, orderId) => {
    const { rows } = await query(
        `SELECT o.order_id AS "orderId", o.created_at AS "date", d.department_name AS "department",
            o.total_amount::float AS total, o.payment_status AS "paymentStatus", c.name AS "customer"
       FROM orders o JOIN departments d ON d.department_id = o.department_id
       LEFT JOIN customers c ON c.customer_id = o.customer_id
      WHERE o.order_id = $1`,
        [orderId]
    );
    if (!rows[0]) throw ApiError.notFound('Order not found');
    const access = await query('SELECT department_id FROM orders WHERE order_id = $1', [orderId]);
    if (!canAccessDepartment(actor, access.rows[0].department_id)) throw ApiError.forbidden();
    const items = await query(
        `SELECT p.product_name AS name, oi.quantity, oi.unit_price::float AS "unitPrice", (oi.quantity*oi.unit_price)::float AS "lineTotal"
       FROM order_items oi JOIN products p ON p.product_id = oi.product_id WHERE oi.order_id = $1`,
        [orderId]
    );
    const pays = await query(
        `SELECT amount::float AS amount, payment_method AS method, processed_at AS "paidAt"
       FROM payments WHERE order_id = $1 AND payment_status = 'SUCCESSFUL' ORDER BY processed_at`,
        [orderId]
    );
    const paid = pays.rows.reduce((s, p) => s + p.amount, 0);
    return { ...rows[0], items: items.rows, payments: pays.rows, amountPaid: paid, balance: Math.max(rows[0].total - paid, 0) };
};

module.exports = { listPayments, getPayment, createPayment, refundPayment, getReceipt };