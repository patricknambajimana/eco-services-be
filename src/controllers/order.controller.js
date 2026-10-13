const asyncHandler = require('../utils/asyncHandler');
const { success, created } = require('../utils/response');
const svc = require('../services/order.service');

const id = (req) => Number(req.params.id);

// customers
exports.listCustomers = asyncHandler(async (req, res) => {
    const { rows, meta } = await svc.listCustomers(req.query);
    success(res, rows, 'Customers retrieved', 200, meta);
});
exports.getCustomer = asyncHandler(async (req, res) => success(res, await svc.getCustomer(id(req))));
exports.createCustomer = asyncHandler(async (req, res) => created(res, await svc.createCustomer(req.body), 'Customer created'));
exports.updateCustomer = asyncHandler(async (req, res) => success(res, await svc.updateCustomer(id(req), req.body), 'Customer updated'));
exports.deleteCustomer = asyncHandler(async (req, res) => {
    await svc.deleteCustomer(id(req));
    success(res, null, 'Customer deleted');
});

// orders
exports.listOrders = asyncHandler(async (req, res) => {
    const { rows, meta } = await svc.listOrders(req.user, req.query);
    success(res, rows, 'Orders retrieved', 200, meta);
});
exports.getOrder = asyncHandler(async (req, res) => success(res, await svc.getOrder(req.user, id(req))));
exports.createOrder = asyncHandler(async (req, res) => created(res, await svc.createOrder(req.user, req.body), 'Order created'));
exports.updateStatus = asyncHandler(async (req, res) => success(res, await svc.updateStatus(req.user, id(req), req.body.status), 'Order status updated'));
exports.deleteOrder = asyncHandler(async (req, res) => {
    await svc.deleteOrder(req.user, id(req));
    success(res, null, 'Order deleted');
});