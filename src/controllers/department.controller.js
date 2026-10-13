const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const svc = require('../services/department.service');

exports.list = asyncHandler(async (_req, res) => success(res, await svc.listDepartments()));
exports.update = asyncHandler(async (req, res) => success(res, await svc.updateDepartment(Number(req.params.id), req.body), 'Department updated'));
exports.listRoles = asyncHandler(async (_req, res) => success(res, await svc.listRoles()));