const { Joi, id, idParam, pagination, STATUS } = require('./common');

module.exports = {
    list: {
        query: Joi.object({
            ...pagination,
            search: Joi.string().trim().max(100),
            departmentId: id,
            category: Joi.string().trim().max(100),
            status: Joi.string().valid(...STATUS.INVENTORY),
        }),
    },
    getOne: { params: idParam() },
    create: {
        body: Joi.object({
            departmentId: id.required(),
            productName: Joi.string().trim().max(150).required(),
            category: Joi.string().trim().max(100).required(),
            quantity: Joi.number().min(0).precision(2).default(0),
            minStockLevel: Joi.number().min(0).precision(2).default(5),
            unit: Joi.string().trim().max(20).default('pcs'),
            expiryDate: Joi.date().iso().allow(null),
        }),
    },
    update: {
        params: idParam(),
        body: Joi.object({
            productName: Joi.string().trim().max(150),
            category: Joi.string().trim().max(100),
            minStockLevel: Joi.number().min(0).precision(2),
            unit: Joi.string().trim().max(20),
            expiryDate: Joi.date().iso().allow(null),
        }).min(1),
    },
    // stock movements
    movementList: {
        query: Joi.object({
            ...pagination,
            itemId: id,
            departmentId: id,
            type: Joi.string().valid(...STATUS.MOVEMENT),
            from: Joi.date().iso(),
            to: Joi.date().iso(),
        }),
    },
    movementCreate: {
        body: Joi.object({
            itemId: id.required(),
            quantity: Joi.number().positive().precision(2).required(),
            movementType: Joi.string().valid(...STATUS.MOVEMENT).required(),
        }),
    },
    // requisitions
    reqList: {
        query: Joi.object({
            ...pagination,
            departmentId: id,
            status: Joi.string().valid(...STATUS.REQUISITION),
            priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT'),
        }),
    },
    reqCreate: {
        body: Joi.object({
            itemId: id.required(),
            quantity: Joi.number().positive().precision(2).required(),
            priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT').default('NORMAL'),
            reason: Joi.string().trim().max(1000).allow('', null),
            requiredDate: Joi.date().iso().allow(null),
        }),
    },
    reqDecision: {
        params: idParam(),
        body: Joi.object({ decision: Joi.string().valid('APPROVED', 'REJECTED').required() }),
    },
    // suppliers
    supplierList: {
        query: Joi.object({ ...pagination, search: Joi.string().trim().max(100), paymentStatus: Joi.string().max(50) }),
    },
    supplierCreate: {
        body: Joi.object({
            supplierName: Joi.string().trim().max(150).required(),
            contactInfo: Joi.string().trim().allow('', null),
            productsSupplied: Joi.string().trim().allow('', null),
            paymentStatus: Joi.string().trim().max(50).default('PENDING'),
        }),
    },
    supplierUpdate: {
        params: idParam(),
        body: Joi.object({
            supplierName: Joi.string().trim().max(150),
            contactInfo: Joi.string().trim().allow('', null),
            productsSupplied: Joi.string().trim().allow('', null),
            paymentStatus: Joi.string().trim().max(50),
        }).min(1),
    },
};