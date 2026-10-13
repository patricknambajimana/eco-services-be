/** Reads ?page & ?limit and returns SQL-ready values. */
const getPagination = (q) => {
    const page = Math.max(parseInt(q.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q.limit, 10) || 20, 1), 100);
    return { page, limit, offset: (page - 1) * limit };
};

const buildMeta = (page, limit, total) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
});

/**
 * Small helper to build WHERE clauses safely.
 *   const w = new WhereBuilder();
 *   w.add('department_id = ?', 2);   // '?' is replaced by $n
 *   w.sql  -> 'WHERE department_id = $1'   w.params -> [2]
 */
class WhereBuilder {
    constructor() { this.parts = []; this.params = []; }

    add(condition, value) {
        this.params.push(value);
        // every '?' in the condition points to the same parameter (handy for ILIKE on several columns)
        this.parts.push(condition.replace(/\?/g, `$${this.params.length}`));
        return this;
    }

    addRaw(condition) { this.parts.push(condition); return this; }

    get sql() { return this.parts.length ? `WHERE ${this.parts.join(' AND ')}` : ''; }
}

module.exports = { getPagination, buildMeta, WhereBuilder };