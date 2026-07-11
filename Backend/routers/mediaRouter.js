const express = require('express');
const mediaController = require('../controllers/mediaController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const auditLogger = require('../middlewares/auditLogger');

const router = express.Router();

router.use(auth);
router.use(role('admin'));
router.use(auditLogger);

router.get('/', mediaController.listMedia);
router.delete('/:id', mediaController.deleteMedia);

module.exports = router;
