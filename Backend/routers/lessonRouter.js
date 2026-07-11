const express = require('express');
const lessonController = require('../controllers/lessonController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const validate = require('../middlewares/validate');
const lessonValidation = require('../validations/lesson');

const router = express.Router();

router.get('/chapter/:chapterId', auth, lessonController.listLessonsByChapter);
router.post(
    '/',
    auth,
    role('instructor', 'admin'),
    validate({ body: lessonValidation.createLessonBody }),
    lessonController.createLesson
);
router.patch(
    '/:id',
    auth,
    role('instructor', 'admin'),
    validate({ body: lessonValidation.updateLessonBody }),
    lessonController.updateLesson
);
router.delete('/:id', auth, role('instructor', 'admin'), lessonController.deleteLesson);

module.exports = router;
