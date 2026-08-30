const { Master, User } = require('../models');
const { success, getPagination, paginationMeta } = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ConflictError } = require('../utils/ApiError');

/**
 * POST /masters/me   (master or user) — create own master profile
 */
const createProfile = asyncHandler(async (req, res) => {
  const existing = await Master.findOne({ user: req.user._id });
  if (existing) throw new ConflictError('Master profile already exists');

  if (req.user.role !== 'master') {
    req.user.role = 'master';
    await req.user.save();
  }

  const master = await Master.create({
    user: req.user._id,
    ...req.body,
  });

  return success(res, { master }, { statusCode: 201 });
});

/**
 * GET /masters/me  (master) — own profile
 */
const getMyProfile = asyncHandler(async (req, res) => {
  const master = await Master.findOne({ user: req.user._id }).populate('devices');
  if (!master) throw new NotFoundError('Master profile not found');
  return success(res, { master });
});

/**
 * PATCH /masters/me  (master) — update own profile
 */
const updateMyProfile = asyncHandler(async (req, res) => {
  const master = await Master.findOneAndUpdate({ user: req.user._id }, req.body, {
    new: true,
    runValidators: true,
  }).populate('devices');
  if (!master) throw new NotFoundError('Master profile not found');
  return success(res, { master });
});

/**
 * GET /masters  (public) — list masters, filter by rating/distance
 */
const listMasters = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, limit } = getPagination(req.query);

  const filter = {};
  if (req.query.rating) filter.rating = { $gte: Number(req.query.rating) };
  if (req.query.isAvailable === 'true') filter.isAvailable = true;
  if (req.query.q) {
    filter.$or = [
      { title: { $regex: req.query.q, $options: 'i' } },
      { bio: { $regex: req.query.q, $options: 'i' } },
    ];
  }

  const sort = req.query.sort === 'rating' ? { rating: -1 } : { createdAt: -1 };

  const [masters, total] = await Promise.all([
    Master.find(filter).sort(sort).skip(skip).limit(limit).populate('user', 'name avatar'),
    Master.countDocuments(filter),
  ]);

  return success(res, { masters }, { meta: paginationMeta(page, pageSize, total) });
});

/**
 * GET /masters/:id  (public) — master profile detail
 */
const getMaster = asyncHandler(async (req, res) => {
  const master = await Master.findById(req.params.id)
    .populate('user', 'name avatar')
    .populate('devices');
  if (!master) throw new NotFoundError('Master not found');
  return success(res, { master });
});

module.exports = { createProfile, getMyProfile, updateMyProfile, listMasters, getMaster };
