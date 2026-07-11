module.exports = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    // Handle Multer errors
    if (err.name === 'MulterError' || err.message === 'Only image and video uploads are allowed.') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    return res.status(500).json({
        success: false,
        message: 'Internal server error.',
        error: err && err.message ? err.message : 'Unknown error'
    });
};
