const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chapter',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        default: ''
    },
    videoUrl: {
        type: String,
        default: ''
    },
    lessonType: {
        type: String,
        enum: ['video', 'text', 'quiz', 'file'],
        default: 'video'
    },
    duration: {
        type: Number,
        default: 0,
        min: 0
    },
    order: {
        type: Number,
        default: 0,
        min: 0
    },
    isPreview: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

lessonSchema.index({ courseId: 1, chapterId: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
