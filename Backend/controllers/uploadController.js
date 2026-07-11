const Media = require('../schema/Media');

exports.uploadSingle = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    try {
        const filePath = `/uploads/${req.file.filename}`;
        let media = await Media.findOne({ path: filePath });

        if (media) {
            // Overwrite existing record
            media.size = req.file.size;
            media.mimeType = req.file.mimetype;
            media.uploadedBy = req.user._id;
            await media.save();
        } else {
            // Create new record
            media = new Media({
                filename: req.file.filename,
                path: filePath,
                mimeType: req.file.mimetype,
                size: req.file.size,
                uploadedBy: req.user._id
            });
            await media.save();
        }

        return res.status(201).json({
            success: true,
            message: 'File uploaded.',
            data: {
                _id: media._id,
                filename: media.filename,
                path: media.path,
                mimeType: media.mimeType,
                size: media.size
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error saving media record.',
            error: error.message
        });
    }
};
