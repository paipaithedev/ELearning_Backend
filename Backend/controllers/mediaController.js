const fs = require('fs');
const path = require('path');
const Media = require('../schema/Media');

exports.listMedia = async (req, res) => {
    try {
        const media = await Media.find()
            .populate('uploadedBy', 'name role')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Media fetched.',
            data: { media, count: media.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch media.',
            error: error.message
        });
    }
};

exports.deleteMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const media = await Media.findById(id);
        if (!media) {
            return res.status(404).json({ success: false, message: 'Media not found.' });
        }

        await Media.findByIdAndDelete(id);
        
        // Delete actual file from local storage
        if (media.path) {
            const filePath = path.join(__dirname, '..', 'public', media.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        return res.status(200).json({
            success: true,
            message: 'Media record removed from library.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete media.',
            error: error.message
        });
    }
};
