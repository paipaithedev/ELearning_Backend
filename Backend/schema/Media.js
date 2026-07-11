const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    path: {
        type: String, // Full path or URL
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number, // In bytes
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    usedIn: {
        type: String, // 'COURSE', 'LESSON', 'USER', etc.
        default: 'UNASSIGNED'
    },
    resourceId: {
        type: String, // ID of the Course or Lesson
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Media', mediaSchema);
