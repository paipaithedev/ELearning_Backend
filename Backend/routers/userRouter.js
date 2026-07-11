const express = require('express');
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const auditLogger = require('../middlewares/auditLogger');
const validate = require('../middlewares/validate');
const userValidation = require('../validations/user');

const router = express.Router();

// Admin / Logged-in actions
router.use(auth);
router.use(auditLogger);

router.get('/', role('admin'), userController.listUsers);
router.post('/', role('admin'), validate({ body: userValidation.adminCreateUserBody }), userController.adminCreateUser);
router.patch('/fcm-token', userController.updateFcmToken);
router.post('/test-push', userController.testPush);
router.patch('/:id', role('admin'), validate({ body: userValidation.editUserBody }), userController.editUser);
router.patch('/:id/role', role('admin'), validate({ body: userValidation.updateUserRoleBody }), userController.updateUserRole);
router.patch('/:id/status', role('admin'), validate({ body: userValidation.updateUserStatusBody }), userController.updateUserStatus);
router.patch('/:id/verify', role('admin'), userController.verifyUser);
router.delete('/:id', role('admin'), userController.deleteUser);

module.exports = router;
