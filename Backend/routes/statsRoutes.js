const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { verifyAdmin } = require('../middlewares/auth');

router.get('/', verifyAdmin, statsController.getStats);

module.exports = router;
