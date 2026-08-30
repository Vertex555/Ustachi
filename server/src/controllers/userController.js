const { User } = require('../models');
const { success } = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const me = asyncHandler(async (req, res) => {
  return success(res, { user: req.user.toSafeJSON() });
});

const updateMe = asyncHandler(async (req, res) => {
  const { name, email, avatar, location } = req.body;
  const user = req.user;

  if (name) user.name = name;
  if (email !== undefined) user.email = email;
  if (avatar !== undefined) user.avatar = avatar;
  if (location) user.location = location;

  await user.save();
  return success(res, { user: user.toSafeJSON() });
});

module.exports = { me, updateMe };
