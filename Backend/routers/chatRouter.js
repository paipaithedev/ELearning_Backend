const express = require('express');
const chatController = require('../controllers/chatController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

const router = express.Router();

router.post('/send', auth, chatController.sendMessage);
router.get('/me', auth, chatController.getMyConversation);
router.get('/admin/conversations', auth, role('admin'), chatController.listConversations);
router.get('/:conversationId', auth, chatController.getMessages);
router.patch('/:conversationId/close', auth, role('admin'), chatController.closeConversation);

module.exports = router;
