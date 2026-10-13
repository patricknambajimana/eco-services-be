const { Joi, id } = require('./common');

const strongPassword = Joi.string()
    .min(8)
    .max(72)
    .pattern(/[a-z]/, 'lowercase')
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[0-9]/, 'number')
    .messages({ 'string.pattern.name': 'Password must contain a {#name} character' });

const pin = Joi.string().pattern(/^\d{4,8}$/).messages({ 'string.pattern.base': 'PIN must be 4-8 digits' });

module.exports = {
    login: {
        body: Joi.object({
            username: Joi.string().trim().max(100).required(),
            password: Joi.string().max(72),
            pin: pin,
            departmentId: id,
        }).or('password', 'pin'),
    },
    changePassword: {
        body: Joi.object({
            currentPassword: Joi.string().required(),
            newPassword: strongPassword.required(),
        }),
    },
    forgotPassword: {
        body: Joi.object({ username: Joi.string().trim().required() }),
    },
    strongPassword,
    pin,
};