const { Joi, id, idParam, pagination, STATUS } = require('./common');
const { strongPassword, pin } = require('./auth.validator');
const { ROLES } = require('../constants/roles');

const roleNames = Joi.string().valid(...Object.values(ROLES));

module.exports = {
    list: {
        query: Joi.object({
            ...pagination,
            search: Joi.string().trim().max(100),
            departmentId: id,
            status: Joi.string().valid(...STATUS.USER),
            role: roleNames,
        }),
    },
    getOne: { params: idParam() },
    create: {
        body: Joi.object({
            fullName: Joi.string().trim().min(2).max(150).required(),
            email: Joi.string().trim().lowercase().email().max(150).required(),
            phone: Joi.string().trim().max(50).allow('', null),
            departmentId: id.allow(null),
            status: Joi.string().valid(...STATUS.USER).default('ACTIVE'),
            roles: Joi.array().items(roleNames).min(1).unique().required(),
            // optional: create login credentials in the same request
            username: Joi.string().trim().alphanum().min(3).max(100),
            password: strongPassword,
            pin,
        }).and('username', 'password'),
    },
    update: {
        params: idParam(),
        body: Joi.object({
            fullName: Joi.string().trim().min(2).max(150),
            email: Joi.string().trim().lowercase().email().max(150),
            phone: Joi.string().trim().max(50).allow('', null),
            departmentId: id.allow(null),
            status: Joi.string().valid(...STATUS.USER),
            roles: Joi.array().items(roleNames).min(1).unique(),
        }).min(1),
    },
    setStatus: {
        params: idParam(),
        body: Joi.object({ status: Joi.string().valid(...STATUS.USER).required() }),
    },
    createCredentials: {
        params: idParam(),
        body: Joi.object({
            username: Joi.string().trim().alphanum().min(3).max(100).required(),
            password: strongPassword.required(),
            pin,
        }),
    },
    resetCredentials: {
        params: idParam(),
        body: Joi.object({ newPassword: strongPassword.required(), pin }),
    },
    setCredentialActive: {
        params: idParam(),
        body: Joi.object({ isActive: Joi.boolean().required() }),
    },
    // schedules
    scheduleList: {
        query: Joi.object({
            ...pagination,
            userId: id,
            departmentId: id,
            from: Joi.date().iso(),
            to: Joi.date().iso(),
        }),
    },
    scheduleCreate: {
        body: Joi.object({
            userId: id.required(),
            shiftDate: Joi.date().iso().required(),
            startTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).required(),
            endTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).required(),
            status: Joi.string().valid(...STATUS.SCHEDULE).default('SCHEDULED'),
        }),
    },
    scheduleUpdate: {
        params: idParam(),
        body: Joi.object({
            shiftDate: Joi.date().iso(),
            startTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
            endTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
            status: Joi.string().valid(...STATUS.SCHEDULE),
        }).min(1),
    },
};