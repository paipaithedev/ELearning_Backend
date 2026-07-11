const express = require('express');
const logController = require('../controllers/logController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

const router = express.Router();

router.get('/', auth, role('admin'), logController.listLogs);

module.exports = router;
