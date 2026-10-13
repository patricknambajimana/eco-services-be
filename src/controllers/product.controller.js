const asyncHandler = require('../utils/asyncHandler');
const { success, created } = require('../utils/response');
const svc = require('../services/product.service');

const id = (req) => Number(req.params.id);

// products
exports.listProducts = asyncHandler(async (req, res) => {
    const { rows, meta } = await svc.listProducts(req.user, req.query);
    success(res, rows, 'Products retrieved', 200, meta);
});
exports.getProduct = asyncHandler(async (req, res) => success(res, await svc.getProduct(req.user, id(req))));
exports.createProduct = asyncHandler(async (req, res) => created(res, await svc.createProduct(req.user, req.body), 'Product created'));
exports.updateProduct = asyncHandler(async (req, res) => success(res, await svc.updateProduct(req.user, id(req), req.body), 'Product updated'));
exports.deleteProduct = asyncHandler(async (req, res) => {
    await svc.deleteProduct(req.user, id(req));
    success(res, null, 'Product deleted');
});

// recipes
exports.listRecipes = asyncHandler(async (req, res) => {
    const { rows, meta } = await svc.listRecipes(req.user, req.query);
    success(res, rows, 'Recipes retrieved', 200, meta);
});
exports.getRecipe = asyncHandler(async (req, res) => success(res, await svc.getRecipe(req.user, id(req))));
exports.createRecipe = asyncHandler(async (req, res) => created(res, await svc.createRecipe(req.user, req.body), 'Recipe created'));
exports.updateRecipe = asyncHandler(async (req, res) => success(res, await svc.updateRecipe(req.user, id(req), req.body), 'Recipe updated'));
exports.deleteRecipe = asyncHandler(async (req, res) => {
    await svc.deleteRecipe(req.user, id(req));
    success(res, null, 'Recipe deleted');
});

// restaurant tables
exports.listTables = asyncHandler(async (req, res) => success(res, await svc.listTables(req.query)));
exports.getTable = asyncHandler(async (req, res) => success(res, await svc.getTable(id(req))));
exports.createTable = asyncHandler(async (req, res) => created(res, await svc.createTable(req.body), 'Table created'));
exports.updateTable = asyncHandler(async (req, res) => success(res, await svc.updateTable(id(req), req.body), 'Table updated'));
exports.deleteTable = asyncHandler(async (req, res) => {
    await svc.deleteTable(id(req));
    success(res, null, 'Table deleted');
});

// production batches
exports.listBatches = asyncHandler(async (req, res) => {
    const { rows, meta } = await svc.listBatches(req.user, req.query);
    success(res, rows, 'Batches retrieved', 200, meta);
});
exports.getBatch = asyncHandler(async (req, res) => success(res, await svc.getBatch(req.user, id(req))));
exports.createBatch = asyncHandler(async (req, res) => created(res, await svc.createBatch(req.user, req.body), 'Production batch planned'));
exports.updateBatchStatus = asyncHandler(async (req, res) =>
    success(res, await svc.updateBatchStatus(req.user, id(req), req.body.status), 'Batch status updated'));