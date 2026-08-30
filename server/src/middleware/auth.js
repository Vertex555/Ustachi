const { verifyAccessToken } = require('../services/authService');
const { UnauthorizedError } = require('../utils/ApiError');
const { User } = require('../models');

async function authenticate(req, res, next) {
  try {
    let token =
      (req.cookies && req.cookies.accessToken) ||
      (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer ') &&
        req.headers.authorization.slice(7));

    if (!token) throw new UnauthorizedError('Authentication required');

    const { valid, payload } = verifyAccessToken(token);
    if (!valid) throw new UnauthorizedError('Invalid or expired token');

    const user = await User.findById(payload.sub).select('-password -refreshToken');
    if (!user || !user.isActive) throw new UnauthorizedError('User not found');

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError('Not authenticated'));
    if (!roles.includes(req.user.role)) {
      const { ForbiddenError } = require('../utils/ApiError');
      return next(new ForbiddenError('You do not have permission'));
    }
    next();
  };
}

function requireVerified(req, res, next) {
  if (!req.user) return next(new UnauthorizedError('Not authenticated'));
  if (!req.user.phoneVerified) {
    const { ForbiddenError } = require('../utils/ApiError');
    return next(new ForbiddenError('Phone number not verified'));
  }
  next();
}

module.exports = { authenticate, authorize, requireVerified };
