const Joi = require('joi');

const id = Joi.number().integer().positive();

const idParam = (name = 'id') => Joi.object({ [name]: id.required() });

const pagination = {
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
};

const STATUS = {
    USER: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ON_LEAVE'],
    ORDER: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED'],
    INVENTORY: ['AVAILABLE', 'LOW STOCK', 'CRITICAL', 'OUT OF STOCK', 'EXPIRED'],
    MOVEMENT: ['PURCHASE', 'TRANSFER_IN', 'TRANSFER_OUT', 'PRODUCTION_USAGE', 'SOLD', 'WASTED'],
    REQUISITION: ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'],
    BATCH: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED'],
    TABLE: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'],
    PAYMENT: ['PENDING', 'SUCCESSFUL', 'FAILED', 'REFUNDED'],
    SCHEDULE: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'ABSENT'],
};

module.exports = { Joi, id, idParam, pagination, STATUS };