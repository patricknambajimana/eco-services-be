const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');

const listDepartments = async () => {
    const { rows } = await query(
        `SELECT department_id AS "departmentId", department_name AS "departmentName", description, created_at AS "createdAt"
       FROM departments ORDER BY department_id`
    );
    return rows;
};

const updateDepartment = async (id, d) => {
    const sets = []; const params = [];
    if (d.departmentName !== undefined) { params.push(d.departmentName); sets.push(`department_name = $${params.length}`); }
    if (d.description !== undefined) { params.push(d.description); sets.push(`description = $${params.length}`); }
    params.push(id);
    const { rows } = await query(
        `UPDATE departments SET ${sets.join(', ')} WHERE department_id = $${params.length}
     RETURNING department_id AS "departmentId", department_name AS "departmentName", description`,
        params
    );
    if (!rows[0]) throw ApiError.notFound('Department not found');
    return rows[0];
};

const listRoles = async () => {
    const { rows } = await query('SELECT role_id AS "roleId", role_name AS "roleName", description FROM roles ORDER BY role_id');
    return rows;
};

module.exports = { listDepartments, updateDepartment, listRoles };