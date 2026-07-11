const express = require('express');
const paymentController = require('../controllers/paymentController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const auditLogger = require('../middlewares/auditLogger');
const validate = require('../middlewares/validate');
const paymentValidation = require('../validations/payment');

const router = express.Router();

router.use(auth);
router.use(auditLogger);

router.post('/manual', paymentController.createManualPayment);
router.post('/', validate({ body: paymentValidation.createPaymentBody }), paymentController.createPayment);
router.get('/me', paymentController.listPayments);
router.get('/', role('admin'), paymentController.listAllPayments);
router.patch('/verify-all', role('admin'), paymentController.verifyAllManualPayments);
router.patch('/:id/verify', role('admin'), validate({ body: paymentValidation.verifyPaymentBody }), paymentController.verifyManualPayment);

module.exports = router;
