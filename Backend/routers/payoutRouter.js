const express = require('express');
const payoutController = require('../controllers/payoutController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const auditLogger = require('../middlewares/auditLogger');

const router = express.Router();

router.use(auth);
router.use(auditLogger);

// Instructor routes
router.post('/request', role('instructor'), payoutController.requestPayout);
router.get('/me', role('instructor'), payoutController.listMyPayouts);

// Admin routes
router.get('/', role('admin'), payoutController.listAllPayouts);
router.patch('/:id/process', role('admin'), payoutController.processPayout);

module.exports = router;
