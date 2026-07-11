const express = require('express');
const enrollmentController = require('../controllers/enrollmentController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const validate = require('../middlewares/validate');
const enrollmentValidation = require('../validations/enrollment');

const router = express.Router();

router.post(
    '/',
    auth,
    role('student', 'admin'),
    validate({ body: enrollmentValidation.enrollBody }),
    enrollmentController.enroll
);
router.get('/me', auth, enrollmentController.myEnrollments);
router.get('/check/:courseId', auth, enrollmentController.checkEnrollment);
router.get('/admin', auth, role('admin'), enrollmentController.adminListEnrollments);
router.delete('/admin/:id', auth, role('admin'), enrollmentController.adminDeleteEnrollment);

module.exports = router;
