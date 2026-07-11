const express = require('express');
const chapterController = require('../controllers/chapterController');
const auth = require('../middlewares/auth');
const optionalAuth = require('../middlewares/optionalAuth');
const role = require('../middlewares/role');
const validate = require('../middlewares/validate');
const chapterValidation = require('../validations/chapter');

const router = express.Router();

router.get('/course/:courseId', optionalAuth, chapterController.listChaptersByCourse);
router.post(
    '/',
    auth,
    role('instructor', 'admin'),
    validate({ body: chapterValidation.createChapterBody }),
    chapterController.createChapter
);
router.patch(
    '/:id',
    auth,
    role('instructor', 'admin'),
    validate({ body: chapterValidation.updateChapterBody }),
    chapterController.updateChapter
);
router.delete('/:id', auth, role('instructor', 'admin'), chapterController.deleteChapter);

module.exports = router;
