const success = (res, data = null, message = 'Success', statusCode = 200, meta) => {
    const body = { success: true, message, data };
    if (meta) body.meta = meta;
    return res.status(statusCode).json(body);
};

const created = (res, data, message = 'Created successfully') => success(res, data, message, 201);

module.exports = { success, created };