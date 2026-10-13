const { Joi, id, idParam, pagination, STATUS } = require('./common');

module.exports = {
    customerList: { query: Joi.object({ ...pagination, search: Joi.string().trim().max(100) }) },
    customerCreate: {
        body: Joi.object({
            name: Joi.string().trim().max(150).required(),
            phone: Joi.string().trim().max(50).allow('', null),
            address: Joi.string().trim().allow('', null),
        }),
    },
    customerUpdate: {
        params: idParam(),
        body: Joi.object({
            name: Joi.string().trim().max(150),
            phone: Joi.string().trim().max(50).allow('', null),
            address: Joi.string().trim().allow('', null),
        }).min(1),
    },
    getOne: { params: idParam() },
    list: {
        query: Joi.object({
            ...pagination,
            departmentId: id,
            status: Joi.string().valid(...STATUS.ORDER),
            paymentStatus: Joi.string().max(30),
            customerId: id,
            from: Joi.date().iso(),
            to: Joi.date().iso(),
        }),
    },
    create: {
        body: Joi.object({
            departmentId: id,
            customerId: id.allow(null),
            orderType: Joi.string().valid('DINE_IN', 'TAKEAWAY', 'PICKUP', 'DELIVERY').default('DINE_IN'),
            items: Joi.array()
                .items(
                    Joi.object({
                        productId: id.required(),
                        quantity: Joi.number().integer().positive().required(),
                        notes: Joi.string().trim().max(500).allow('', null),
                    })
                )
                .min(1)
                .required(),
        }),
    },
    updateStatus: {
        params: idParam(),
        body: Joi.object({ status: Joi.string().valid(...STATUS.ORDER).required() }),
    },
    // payments
    paymentCreate: {
        body: Joi.object({
            orderId: id.required(),
            amount: Joi.number().positive().precision(2).required(),
            paymentMethod: Joi.string().valid('CASH', 'CARD', 'MOBILE_MONEY').required(),
        }),
    },
    paymentList: {
        query: Joi.object({
            ...pagination,
            orderId: id,
            departmentId: id,
            method: Joi.string().valid('CASH', 'CARD', 'MOBILE_MONEY'),
            from: Joi.date().iso(),
            to: Joi.date().iso(),
        }),
    },
    refund: { params: idParam() },
    // reports
    report: {
        query: Joi.object({ from: Joi.date().iso(), to: Joi.date().iso(), departmentId: id }),
    },
};