const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const { UnauthorizedError } = require('../utils/ApiError');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpires }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpires }
  );
}

function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret);
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.refreshSecret);
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

async function setRefreshToken(userId, token) {
  await User.findByIdAndUpdate(userId, { refreshToken: token });
}

async function clearRefreshToken(userId) {
  await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
}

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await setRefreshToken(user._id, refreshToken);
  return { accessToken, refreshToken };
}

async function rotateRefreshToken(refreshToken) {
  const { valid, payload } = verifyRefreshToken(refreshToken);
  if (!valid) throw new UnauthorizedError('Invalid refresh token');

  const user = await User.findById(payload.sub).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    throw new UnauthorizedError('Refresh token mismatch');
  }
  return issueTokens(user);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setRefreshToken,
  clearRefreshToken,
  issueTokens,
  rotateRefreshToken,
};
