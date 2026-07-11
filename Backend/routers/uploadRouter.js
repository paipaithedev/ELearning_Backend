const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'public/uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '');
        const base = path.basename(file.originalname || 'file', ext)
            .replace(/[^a-z0-9]/gi, '-') // Replace non-alphanumeric with hyphens
            .replace(/-+/g, '-')         // Consolidate multiple hyphens
            .replace(/^-|-$/g, '');      // Trim hyphens from ends
        cb(null, `${base}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/'))) {
        return cb(null, true);
    }
    return cb(new Error('Only image and video uploads are allowed.'));
};

const upload = multer({ 
    storage, 
    fileFilter, 
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

router.post('/file', auth, role('student', 'instructor', 'admin'), upload.single('file'), uploadController.uploadSingle);
router.post('/image', auth, role('student', 'instructor', 'admin'), upload.single('file'), uploadController.uploadSingle);

module.exports = router;
