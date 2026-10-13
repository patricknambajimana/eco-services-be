const { GLOBAL_ROLES } = require('../constants/roles');

const isGlobalUser = (user) => user.roles.some((r) => GLOBAL_ROLES.includes(r));

/**
 * Department scoping.
 * - Global users (SUPER_ADMIN, GENERAL_MANAGER, ACCOUNTANT) may pick any department (or none = all).
 * - Everyone else is always restricted to their own department.
 */
const resolveDepartment = (user, requestedId) => {
    if (isGlobalUser(user)) return requestedId ? Number(requestedId) : null;
    return user.departmentId;
};

/** True if the user is allowed to touch data of the given department. */
const canAccessDepartment = (user, departmentId) =>
    isGlobalUser(user) || Number(user.departmentId) === Number(departmentId);

module.exports = { isGlobalUser, resolveDepartment, canAccessDepartment };