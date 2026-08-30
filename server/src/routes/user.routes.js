const router = require('express').Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.get('/me', authenticate, userController.me);
router.patch('/me', authenticate, userController.updateMe);

module.exports = router;
