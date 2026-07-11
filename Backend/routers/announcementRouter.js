const express = require('express');
const announcementController = require('../controllers/announcementController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

const router = express.Router();

// Public/Student Routes
router.get('/active', announcementController.listActiveAnnouncements);

// Admin Routes
router.get('/', auth, role('admin'), announcementController.listAllAnnouncements);
router.post('/', auth, role('admin'), announcementController.createAnnouncement);
router.patch('/:id', auth, role('admin'), announcementController.updateAnnouncement);
router.delete('/:id', auth, role('admin'), announcementController.deleteAnnouncement);

module.exports = router;
