const Announcement = require('../schema/Announcement');
const { notifyAll } = require('../utils/notification');

exports.createAnnouncement = async (req, res) => {
    try {
        const { title, content, type, targetRoles, expiresAt } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ success: false, message: 'Title and content are required.' });
        }

        const announcement = await Announcement.create({
            title,
            content,
            type: type || 'info',
            targetRoles: targetRoles || ['all'],
            expiresAt,
            createdBy: req.user._id
        });

        // Notify all users about the announcement
        notifyAll('New Announcement: ' + title, content.substring(0, 100) + '...');

        return res.status(201).json({
            success: true,
            message: 'Announcement created.',
            data: { announcement }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create announcement.',
            error: error.message
        });
    }
};

exports.listAllAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Announcements fetched.',
            data: { announcements, count: announcements.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch announcements.',
            error: error.message
        });
    }
};

exports.listActiveAnnouncements = async (req, res) => {
    try {
        const now = new Date();
        const announcements = await Announcement.find({
            isActive: true,
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: now } }
            ]
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Active announcements fetched.',
            data: { announcements, count: announcements.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch active announcements.',
            error: error.message
        });
    }
};

exports.updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const update = req.body;

        const announcement = await Announcement.findByIdAndUpdate(id, update, { new: true });

        if (!announcement) {
            return res.status(404).json({ success: false, message: 'Announcement not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Announcement updated.',
            data: { announcement }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update announcement.',
            error: error.message
        });
    }
};

exports.deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        await Announcement.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: 'Announcement deleted.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete announcement.',
            error: error.message
        });
    }
};
