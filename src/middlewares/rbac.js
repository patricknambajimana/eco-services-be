const ApiError = require('../utils/ApiError');
const { ROLES } = require('../constants/roles');

/**
 * Allow only users holding at least one of the given roles.
 * SUPER_ADMIN always passes.
 *   router.post('/', authenticate, authorize(GROUPS.ADMINS), ctrl.create)
 */
const authorize = (allowedRoles = []) => (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    const { roles } = req.user;
    if (roles.includes(ROLES.SUPER_ADMIN) || roles.some((r) => allowedRoles.includes(r))) {
        return next();
    }
    return next(ApiError.forbidden());
};

module.exports = { authorize };