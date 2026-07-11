const express = require('express');
const reviewController = require('../controllers/reviewController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const validate = require('../middlewares/validate');
const reviewValidation = require('../validations/review');

const router = express.Router();

router.get('/course/:courseId', reviewController.listReviewsByCourse);
router.post('/', auth, validate({ body: reviewValidation.createReviewBody }), reviewController.createReview);

// Admin Routes
router.get('/', auth, role('admin'), reviewController.listAllReviews);
router.delete('/:id', auth, role('admin'), reviewController.deleteReview);

module.exports = router;
