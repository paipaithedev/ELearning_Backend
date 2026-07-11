const express = require('express');
const courseController = require('../controllers/courseController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const auditLogger = require('../middlewares/auditLogger');
const validate = require('../middlewares/validate');
const courseValidation = require('../validations/course');

const router = express.Router();

router.get('/', courseController.listCourses);
router.get('/:id', courseController.getCourseById);
router.post(
    '/',
    auth,
    role('instructor', 'admin'),
    auditLogger, // Apply audit logger here
    validate({ body: courseValidation.createCourseBody }),
    courseController.createCourse
);
router.patch(
    '/:id',
    auth,
    role('instructor', 'admin'),
    validate({ body: courseValidation.updateCourseBody }),
    courseController.updateCourse
);
router.delete('/:id', auth, role('instructor', 'admin'), courseController.deleteCourse);

module.exports = router;
