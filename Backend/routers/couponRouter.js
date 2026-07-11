const express = require('express');
const couponController = require('../controllers/couponController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

const router = express.Router();

// Public/Student Routes
router.post('/validate', auth, couponController.validateCoupon);

// Admin Routes
router.get('/', auth, role('admin'), couponController.listAllCoupons);
router.post('/', auth, role('admin'), couponController.createCoupon);
router.patch('/:id', auth, role('admin'), couponController.updateCoupon);
router.delete('/:id', auth, role('admin'), couponController.deleteCoupon);

module.exports = router;
