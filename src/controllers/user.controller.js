const asyncHandler = require('../utils/asyncHandler');
const { success, created } = require('../utils/response');
const svc = require('../services/user.service');

exports.list = asyncHandler(async (req, res) => {
    const { rows, meta } = await svc.list(req.user, req.query);
    success(res, rows, 'Staff retrieved', 200, meta);
});
exports.getOne = asyncHandler(async (req, res) => success(res, await svc.getById(req.user, Number(req.params.id))));
exports.create = asyncHandler(async (req, res) => created(res, await svc.create(req.user, req.body), 'Staff member created'));
exports.update = asyncHandler(async (req, res) => success(res, await svc.update(req.user, Number(req.params.id), req.body), 'Staff member updated'));
exports.setStatus = asyncHandler(async (req, res) => success(res, await svc.setStatus(req.user, Number(req.params.id), req.body.status), 'Status updated'));
exports.remove = asyncHandler(async (req, res) => {
    await svc.remove(req.user, Number(req.params.id));
    success(res, null, 'Staff member deleted');
});

// credentials
exports.createCredentials = asyncHandler(async (req, res) =>
    created(res, await svc.createCredentials(req.user, Number(req.params.id), req.body), 'Credentials created'));
exports.resetCredentials = asyncHandler(async (req, res) => {
    await svc.resetCredentials(req.user, Number(req.params.id), req.body);
    success(res, null, 'Credentials reset');
});
exports.setCredentialActive = asyncHandler(async (req, res) => {
    await svc.setCredentialActive(req.user, Number(req.params.id), req.body.isActive);
    success(res, null, req.body.isActive ? 'Credentials activated' : 'Credentials deactivated');
});

// schedules
exports.listSchedules = asyncHandler(async (req, res) => {
    const { rows, meta } = await svc.listSchedules(req.user, req.query);
    success(res, rows, 'Schedules retrieved', 200, meta);
});
exports.createSchedule = asyncHandler(async (req, res) => created(res, await svc.createSchedule(req.user, req.body), 'Shift created'));
exports.updateSchedule = asyncHandler(async (req, res) => success(res, await svc.updateSchedule(req.user, Number(req.params.id), req.body), 'Shift updated'));
exports.deleteSchedule = asyncHandler(async (req, res) => {
    await svc.deleteSchedule(req.user, Number(req.params.id));
    success(res, null, 'Shift deleted');
});