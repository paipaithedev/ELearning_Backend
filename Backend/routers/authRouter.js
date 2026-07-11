const express = require('express');
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const validate = require('../middlewares/validate');
const authValidation = require('../validations/auth');

const router = express.Router();

router.post('/register', validate({ body: authValidation.registerBody }), authController.register);
router.post('/login', validate({ body: authValidation.loginBody }), authController.login);
router.get('/me', auth, authController.me);
router.patch('/me', auth, validate({ body: authValidation.updateMeBody }), authController.updateMe);
router.get('/verify-email', authController.verifyEmail);
router.post('/forgot-password', validate({ body: authValidation.forgotPasswordBody }), authController.forgotPassword);
router.post('/reset-password', validate({ body: authValidation.resetPasswordBody }), authController.resetPassword);
router.get('/admin-check', auth, role('admin'), (req, res) => {
    res.json({ ok: true });
});

module.exports = router;
