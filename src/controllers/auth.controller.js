const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const authService = require('../services/auth.service');

exports.login = asyncHandler(async (req, res) => {
    success(res, await authService.login(req.body), 'Login successful');
});

exports.me = asyncHandler(async (req, res) => {
    success(res, await authService.getProfile(req.user.id));
});

exports.changePassword = asyncHandler(async (req, res) => {
    await authService.changePassword(req.user.id, req.body);
    success(res, null, 'Password changed successfully');
});

exports.forgotPassword = asyncHandler(async (req, res) => {
    const temp = await authService.forgotPassword(req.body);
    // Same response whether or not the username exists
    success(res, temp ? { temporaryPassword: temp } : null, 'If the account exists, a temporary password has been issued');
});