const authService = require('../services/auth.service');
const catchAsync = require('../utils/catchAsync');
const { sendResponse } = require('../utils/response');

exports.login = catchAsync(async (req, res) => {
  const { username, password } = req.body;

  const result = await authService.login(username, password);

  sendResponse(res, 200, {
    user: result.user,
    tokens: result.tokens,
  });
});

exports.refreshToken = catchAsync(async (req, res) => {
  const { refresh_token } = req.body;

  const result = await authService.refreshToken(refresh_token);

  sendResponse(res, 200, result);
});

exports.logout = catchAsync(async (req, res) => {
  // Client-side token removal
  // Could also invalidate session in database here if needed
  res.status(204).send();
});

exports.me = catchAsync(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);

  sendResponse(res, 200, user);
});

exports.changePassword = catchAsync(async (req, res) => {
  const { current_password, new_password } = req.body;

  const result = await authService.changePassword(
    req.user.id,
    current_password,
    new_password
  );

  sendResponse(res, 200, result);
});
