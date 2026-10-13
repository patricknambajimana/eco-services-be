const asyncHandler = require('../utils/asyncHandler');
const { success, created } = require('../utils/response');
const svc = require('../services/inventory.service');

const id = (req) => Number(req.params.id);

// items
exports.listItems = asyncHandler(async (req, res) => {
    const { rows, meta } = await svc.listItems(req.user, req.query);
    success(res, rows, 'Inventory retrieved', 200, meta);
});
exports.getItem = asyncHandler(async (req, res) => success(res, await svc.getItem(req.user, id(req))));
exports.createItem = asyncHandler(async (req, res) => created(res, await svc.createItem(req.user, req.body), 'Item created'));
exports.updateItem = asyncHandler(async (req, res) => success(res, await svc.updateItem(req.user, id(req), req.body), 'Item updated'));
exports.deleteItem = asyncHandler(async (req, res) => {
    await svc.deleteItem(req.user, id(req));
    success(res, null, 'Item deleted');
});
exports.alerts = asyncHandler(async (req, res) => success(res, await svc.alerts(req.user, req.query)));

// movements
exports.listMovements = asyncHandler(async (req, res) => {
    const { rows, meta } = await svc.listMovements(req.user, req.query);
    success(res, rows, 'Stock movements retrieved', 200, meta);
});
exports.createMovement = asyncHandler(async (req, res) => created(res, await svc.createMovement(req.user, req.body), 'Stock movement recorded'));

// requisitions
exports.listRequisitions = asyncHandler(async (req, res) => {
    const { rows, meta } = await svc.listRequisitions(req.user, req.query);
    success(res, rows, 'Requisitions retrieved', 200, meta);
});
exports.getRequisition = asyncHandler(async (req, res) => success(res, await svc.getRequisition(req.user, id(req))));
exports.createRequisition = asyncHandler(async (req, res) => created(res, await svc.createRequisition(req.user, req.body), 'Requisition submitted'));
exports.decideRequisition = asyncHandler(async (req, res) =>
    success(res, await svc.decideRequisition(req.user, id(req), req.body.decision), `Requisition ${req.body.decision.toLowerCase()}`));
exports.fulfillRequisition = asyncHandler(async (req, res) => success(res, await svc.fulfillRequisition(req.user, id(req)), 'Requisition fulfilled, stock updated'));

// suppliers
exports.listSuppliers = asyncHandler(async (req, res) => {
    const { rows, meta } = await svc.listSuppliers(req.query);
    success(res, rows, 'Suppliers retrieved', 200, meta);
});
exports.getSupplier = asyncHandler(async (req, res) => success(res, await svc.getSupplier(id(req))));
exports.createSupplier = asyncHandler(async (req, res) => created(res, await svc.createSupplier(req.body), 'Supplier created'));
exports.updateSupplier = asyncHandler(async (req, res) => success(res, await svc.updateSupplier(id(req), req.body), 'Supplier updated'));
exports.deleteSupplier = asyncHandler(async (req, res) => {
    await svc.deleteSupplier(id(req));
    success(res, null, 'Supplier deleted');
});