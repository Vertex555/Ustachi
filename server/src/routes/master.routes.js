const router = require('express').Router();
const masterController = require('../controllers/masterController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { masterProfileSchema } = require('../validators/master.validator');
const { paginationSchema } = require('../validators/common.validator');

router.get('/', validate(paginationSchema, 'query'), masterController.listMasters);
router.get('/me', authenticate, masterController.getMyProfile);
router.post('/me', authenticate, validate(masterProfileSchema), masterController.createProfile);
router.patch('/me', authenticate, validate(masterProfileSchema), masterController.updateMyProfile);
router.get('/:id', masterController.getMaster);

module.exports = router;
