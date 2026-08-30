const router = require('express').Router();
const { Device } = require('../models');
const { success, getPagination, paginationMeta } = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ConflictError } = require('../utils/ApiError');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, limit } = getPagination(req.query);
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.q) {
      filter.$or = [
        { name: { $regex: req.query.q, $options: 'i' } },
        { brand: { $regex: req.query.q, $options: 'i' } },
      ];
    }
    const [devices, total] = await Promise.all([
      Device.find(filter).skip(skip).limit(limit),
      Device.countDocuments(filter),
    ]);
    return success(res, { devices }, { meta: paginationMeta(page, pageSize, total) });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, brand, model, category, image } = req.body;
    const existing = await Device.findOne({ name, brand, model });
    if (existing) throw new ConflictError('Device already exists');
    const device = await Device.create({ name, brand, model, category, image });
    return success(res, { device }, { statusCode: 201 });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const device = await Device.findById(req.params.id);
    if (!device) throw new NotFoundError('Device not found');
    return success(res, { device });
  })
);

module.exports = router;
