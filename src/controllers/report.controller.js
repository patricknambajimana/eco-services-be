const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const svc = require('../services/report.service');

const make = (fn) => asyncHandler(async (req, res) => success(res, await fn(req.user, req.query)));

exports.dashboard = make(svc.dashboard);
exports.sales = make(svc.sales);
exports.departmentComparison = make(svc.departmentComparison);
exports.topProducts = make(svc.topProducts);
exports.profitLoss = make(svc.profitLoss);
exports.inventory = make(svc.inventoryReport);