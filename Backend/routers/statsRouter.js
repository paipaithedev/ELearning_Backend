const express = require('express');
const statsController = require('../controllers/statsController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

const router = express.Router();

router.get('/', auth, role('admin'), statsController.getStats);
router.get('/advanced', auth, role('admin'), statsController.getAdvancedStats);
router.get('/notifications', auth, role('admin'), statsController.getNotifications);
router.post('/notifications/dismiss-all', auth, role('admin'), statsController.dismissAllNotifications);
router.post('/notifications/:id/dismiss', auth, role('admin'), statsController.dismissNotification);

module.exports = router;
