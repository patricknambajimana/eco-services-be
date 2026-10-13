const asyncHandler = require('../utils/asyncHandler');
const { success, created } = require('../utils/response');
const svc = require('../services/payment.service');

exports.list = asyncHandler(async (req, res) => {
    const { rows, meta } = await svc.listPayments(req.user, req.query);
    success(res, rows, 'Payments retrieved', 200, meta);
});
exports.getOne = asyncHandler(async (req, res) => success(res, await svc.getPayment(req.user, Number(req.params.id))));
exports.create = asyncHandler(async (req, res) => created(res, await svc.createPayment(req.user, req.body), 'Payment recorded'));
exports.refund = asyncHandler(async (req, res) => success(res, await svc.refundPayment(req.user, Number(req.params.id)), 'Payment refunded'));
exports.receipt = asyncHandler(async (req, res) => success(res, await svc.getReceipt(req.user, Number(req.params.id))));