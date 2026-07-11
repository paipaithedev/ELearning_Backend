const express = require('express');
const progressController = require('../controllers/progressController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const progressValidation = require('../validations/progress');

const router = express.Router();

router.post('/', auth, validate({ body: progressValidation.upsertProgressBody }), progressController.upsertProgress);
router.get('/course/:courseId', auth, progressController.getCourseProgress);

module.exports = router;
