const router = require('express').Router();
const healthController = require('../controllers/healthController');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const masterRoutes = require('./master.routes');
const deviceRoutes = require('./device.routes');
const uploadRoutes = require('./upload.routes');

// Public health check
router.get('/health', healthController.health);

// Versioned resource routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/masters', masterRoutes);
router.use('/devices', deviceRoutes);
router.use('/uploads', uploadRoutes);

// Future: /problems, /orders, /conversations, /messages, /payments, /reviews,
// /notifications to be added in later phases.

module.exports = router;
