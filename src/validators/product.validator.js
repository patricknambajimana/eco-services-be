const { Joi, id, idParam, pagination, STATUS } = require('./common');

const ingredients = Joi.array().items(
    Joi.object({ itemId: id.required(), quantityRequired: Joi.number().positive().precision(2).required() })
);

module.exports = {
    list: {
        query: Joi.object({
            ...pagination,
            search: Joi.string().trim().max(100),
            departmentId: id,
            category: Joi.string().trim().max(100),
            isAvailable: Joi.boolean(),
        }),
    },
    getOne: { params: idParam() },
    create: {
        body: Joi.object({
            departmentId: id.required(),
            productName: Joi.string().trim().max(150).required(),
            category: Joi.string().trim().max(100).allow('', null),
            sellingPrice: Joi.number().min(0).precision(2).required(),
            costPrice: Joi.number().min(0).precision(2).allow(null),
            preparationTime: Joi.number().integer().min(0).allow(null),
            shelfLife: Joi.number().integer().min(0).allow(null),
            isAvailable: Joi.boolean().default(true),
        }),
    },
    update: {
        params: idParam(),
        body: Joi.object({
            productName: Joi.string().trim().max(150),
            category: Joi.string().trim().max(100).allow('', null),
            sellingPrice: Joi.number().min(0).precision(2),
            costPrice: Joi.number().min(0).precision(2).allow(null),
            preparationTime: Joi.number().integer().min(0).allow(null),
            shelfLife: Joi.number().integer().min(0).allow(null),
            isAvailable: Joi.boolean(),
        }).min(1),
    },
    // recipes
    recipeList: { query: Joi.object({ ...pagination, productId: id, search: Joi.string().trim().max(100) }) },
    recipeCreate: {
        body: Joi.object({
            productId: id.required(),
            recipeName: Joi.string().trim().max(150).required(),
            preparationSteps: Joi.string().trim().allow('', null),
            cookingTime: Joi.number().integer().min(0).allow(null),
            requiredEquipment: Joi.string().trim().max(255).allow('', null),
            ingredients: ingredients.default([]),
        }),
    },
    recipeUpdate: {
        params: idParam(),
        body: Joi.object({
            recipeName: Joi.string().trim().max(150),
            preparationSteps: Joi.string().trim().allow('', null),
            cookingTime: Joi.number().integer().min(0).allow(null),
            requiredEquipment: Joi.string().trim().max(255).allow('', null),
            ingredients,
        }).min(1),
    },
    // restaurant tables
    tableList: { query: Joi.object({ status: Joi.string().valid(...STATUS.TABLE) }) },
    tableCreate: {
        body: Joi.object({
            tableNumber: Joi.string().trim().max(20).required(),
            capacity: Joi.number().integer().min(1).max(100).required(),
            status: Joi.string().valid(...STATUS.TABLE).default('AVAILABLE'),
        }),
    },
    tableUpdate: {
        params: idParam(),
        body: Joi.object({
            tableNumber: Joi.string().trim().max(20),
            capacity: Joi.number().integer().min(1).max(100),
            status: Joi.string().valid(...STATUS.TABLE),
        }).min(1),
    },
    // production batches
    batchList: {
        query: Joi.object({ ...pagination, status: Joi.string().valid(...STATUS.BATCH), productId: id }),
    },
    batchCreate: {
        body: Joi.object({
            productId: id.required(),
            productionQuantity: Joi.number().integer().positive().required(),
            expiryTime: Joi.date().iso().allow(null),
            chefId: id.allow(null),
        }),
    },
    batchStatus: {
        params: idParam(),
        body: Joi.object({ status: Joi.string().valid(...STATUS.BATCH).required() }),
    },
};