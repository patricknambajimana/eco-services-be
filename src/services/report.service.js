const { query } = require('../config/db');
const { WhereBuilder } = require('../utils/pagination');
const { resolveDepartment } = require('../utils/department');

/** Builds a date + department filter on orders (alias o). */
const orderFilter = (actor, q) => {
    const w = new WhereBuilder();
    const dept = resolveDepartment(actor, q.departmentId);
    if (dept) w.add('o.department_id = ?', dept);
    if (q.from) w.add('o.created_at >= ?', q.from);
    if (q.to) w.add('o.created_at < (?::date + 1)', q.to);
    return w;
};

/** Dashboard summary cards (revenue, orders, inventory alerts, staff). */
const dashboard = async (actor, q) => {
    const dept = resolveDepartment(actor, q.departmentId);
    const dParams = dept ? [dept] : [];
    const dFilter = (col) => (dept ? `AND ${col} = $1` : '');

    const [revenue, orders, byStatus, alerts, staff, tablesRes] = await Promise.all([
        query(
            `SELECT COALESCE(SUM(p.amount),0)::float AS total
         FROM payments p JOIN orders o ON o.order_id = p.order_id
        WHERE p.payment_status = 'SUCCESSFUL' ${dFilter('o.department_id')}`, dParams),
        query(`SELECT COUNT(*)::int AS n FROM orders o WHERE o.status <> 'COMPLETED' ${dFilter('o.department_id')}`, dParams),
        query(`SELECT status, COUNT(*)::int AS count FROM orders o WHERE TRUE ${dFilter('o.department_id')} GROUP BY status`, dParams),
        query(`SELECT COUNT(*)::int AS n FROM inventory_items i WHERE i.status <> 'AVAILABLE' ${dFilter('i.department_id')}`, dParams),
        query(
            `SELECT COUNT(DISTINCT s.user_id)::int AS n FROM staff_schedules s JOIN users u ON u.user_id = s.user_id
        WHERE s.shift_date = CURRENT_DATE AND s.status = 'SCHEDULED' ${dFilter('u.department_id')}`, dParams),
        query(`SELECT status, COUNT(*)::int AS count FROM restaurant_tables GROUP BY status`),
    ]);

    return {
        totalRevenue: revenue.rows[0].total,
        activeOrders: orders.rows[0].n,
        ordersByStatus: byStatus.rows,
        inventoryAlerts: alerts.rows[0].n,
        staffOnShiftToday: staff.rows[0].n,
        tableOccupancy: tablesRes.rows,
    };
};

/** Revenue grouped by department and day. */
const sales = async (actor, q) => {
    const w = orderFilter(actor, q);
    w.addRaw(`p.payment_status = 'SUCCESSFUL'`);
    const { rows } = await query(
        `SELECT d.department_name AS department, DATE(p.processed_at) AS day,
            COUNT(DISTINCT o.order_id)::int AS orders, SUM(p.amount)::float AS revenue
       FROM payments p
       JOIN orders o ON o.order_id = p.order_id
       JOIN departments d ON d.department_id = o.department_id
       ${w.sql}
      GROUP BY d.department_name, DATE(p.processed_at)
      ORDER BY day DESC, department`,
        w.params
    );
    return rows;
};

const departmentComparison = async (actor, q) => {
    const w = orderFilter(actor, q);
    const { rows } = await query(
        `SELECT d.department_name AS department,
            COUNT(o.order_id)::int AS orders,
            COALESCE(SUM(o.total_amount),0)::float AS "totalSales",
            COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'PAID'),0)::float AS "paidSales"
       FROM departments d
       LEFT JOIN orders o ON o.department_id = d.department_id ${w.sql ? 'AND ' + w.parts.join(' AND ') : ''}
      GROUP BY d.department_name ORDER BY "totalSales" DESC`,
        w.params
    );
    return rows;
};

const topProducts = async (actor, q) => {
    const w = orderFilter(actor, q);
    const { rows } = await query(
        `SELECT p.product_name AS product, d.department_name AS department,
            SUM(oi.quantity)::int AS "unitsSold", SUM(oi.quantity * oi.unit_price)::float AS revenue
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       JOIN products p ON p.product_id = oi.product_id
       JOIN departments d ON d.department_id = p.department_id
       ${w.sql}
      GROUP BY p.product_name, d.department_name
      ORDER BY "unitsSold" DESC LIMIT 10`,
        w.params
    );
    return rows;
};

/** Profit & loss estimate: revenue from sold items minus product cost price. */
const profitLoss = async (actor, q) => {
    const w = orderFilter(actor, q);
    const { rows } = await query(
        `SELECT COALESCE(SUM(oi.quantity * oi.unit_price),0)::float AS revenue,
            COALESCE(SUM(oi.quantity * COALESCE(p.cost_price,0)),0)::float AS cost
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       JOIN products p ON p.product_id = oi.product_id
       ${w.sql}`,
        w.params
    );
    const { revenue, cost } = rows[0];
    return { revenue, cost, profit: revenue - cost, marginPercent: revenue ? Number((((revenue - cost) / revenue) * 100).toFixed(2)) : 0 };
};

const inventoryReport = async (actor, q) => {
    const dept = resolveDepartment(actor, q.departmentId);
    const { rows } = await query(
        `SELECT d.department_name AS department, i.status, COUNT(*)::int AS items
       FROM inventory_items i JOIN departments d ON d.department_id = i.department_id
      ${dept ? 'WHERE i.department_id = $1' : ''}
      GROUP BY d.department_name, i.status ORDER BY department, i.status`,
        dept ? [dept] : []
    );
    return rows;
};

module.exports = { dashboard, sales, departmentComparison, topProducts, profitLoss, inventoryReport };