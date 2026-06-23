'use strict';

const asyncHandler = require('../utils/async.handler');
const { sendSuccess } = require('../utils/http.response');
const authService = require('../services/auth.service');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return sendSuccess(res, 201, result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return sendSuccess(res, 200, result);
});

const refresh = asyncHandler(async (req, res) => {
  const tokens = await authService.refresh(req.body);
  return sendSuccess(res, 200, tokens);
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  return sendSuccess(res, 200, user);
});

module.exports = { register, login, refresh, me };
