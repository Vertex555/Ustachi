const { User } = require('../models');
const {
  issueTokens,
  clearRefreshToken,
  rotateRefreshToken,
} = require('../services/authService');
const verificationService = require('../services/verificationService');
const config = require('../config');
const { success } = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { ConflictError, UnauthorizedError, ForbiddenError } = require('../utils/ApiError');

const setCookies = (res, { accessToken, refreshToken }) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite,
    maxAge: config.cookies.accessMaxAge,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite,
    maxAge: config.cookies.refreshMaxAge,
  });
};

const clearCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};

/**
 * POST /auth/register
 * Creates a user and issues an OTP for phone verification.
 */
const register = asyncHandler(async (req, res) => {
  const { name, phone, password, role, email } = req.body;

  const existing = await User.findOne({ phone });
  if (existing) throw new ConflictError('Phone number already registered');

  const user = await User.create({ name, phone, password, role, email });

  // Send OTP (login/register flow). Dev fallback returns code if Telegram unconfigured.
  const otpResult = await verificationService.issue(phone, 'register', user._id);

  return success(
    res,
    { user: user.toSafeJSON(), devCode: otpResult.delivered ? undefined : otpResult.code },
    { statusCode: 201, message: 'Registration successful. Verify your phone with the OTP.' }
  );
});

/**
 * POST /auth/request-otp
 * Issue (and send) an OTP for a phone/type without creating an account.
 */
const requestOtp = asyncHandler(async (req, res) => {
  const { phone, type } = req.body;
  const otpResult = await verificationService.issue(phone, type);
  return success(
    res,
    { sent: otpResult.delivered, devCode: otpResult.delivered ? undefined : otpResult.code },
    { message: 'OTP sent' }
  );
});

/**
 * POST /auth/verify
 * Verifies the OTP and (for registration) marks phoneVerified.
 */
const verify = asyncHandler(async (req, res) => {
  const { phone, code, type } = req.body;
  await verificationService.verify(phone, type, code);

  const user = await User.findOne({ phone });
  if (user && !user.phoneVerified) {
    user.phoneVerified = true;
    await user.save();
  }

  const tokens = user ? await issueTokens(user) : null;
  if (tokens) setCookies(res, tokens);

  return success(res, { user: user ? user.toSafeJSON() : null }, {
    message: 'Phone verified successfully',
  });
});

/**
 * POST /auth/login
 * Validates credentials, then requires OTP verification.
 */
const login = asyncHandler(async (req, res) => {
  const { phone, password, code } = req.body;

  const user = await User.findOne({ phone }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new UnauthorizedError('Invalid credentials');
  }
  if (!user.isActive) throw new ForbiddenError('Account is deactivated');

  if (!user.phoneVerified) {
    const otpResult = await verificationService.issue(phone, 'login', user._id);
    return success(res, { requiresOtp: true, devCode: otpResult.delivered ? undefined : otpResult.code }, {
      statusCode: 200,
      message: 'OTP sent. Please verify.',
    });
  }

  if (!code) {
    const otpResult = await verificationService.issue(phone, 'login', user._id);
    return success(res, { requiresOtp: true, devCode: otpResult.delivered ? undefined : otpResult.code }, {
      statusCode: 200,
      message: 'OTP sent. Please verify.',
    });
  }

  await verificationService.verify(phone, 'login', code);

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueTokens(user);
  setCookies(res, tokens);

  return success(res, { user: user.toSafeJSON() }, { message: 'Login successful' });
});

/**
 * POST /auth/refresh
 * Rotates the refresh token.
 */
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new UnauthorizedError('No refresh token');

  const tokens = await rotateRefreshToken(token);
  setCookies(res, tokens);
  return success(res, { refreshed: true });
});

/**
 * POST /auth/logout
 * Clears tokens.
 */
const logout = asyncHandler(async (req, res) => {
  if (req.user) await clearRefreshToken(req.user._id);
  clearCookies(res);
  return success(res, null, { message: 'Logged out' });
});

/**
 * GET /auth/me
 * Returns the current authenticated user.
 */
const me = asyncHandler(async (req, res) => {
  return success(res, { user: req.user.toSafeJSON() });
});

module.exports = { register, requestOtp, verify, login, refresh, logout, me };
