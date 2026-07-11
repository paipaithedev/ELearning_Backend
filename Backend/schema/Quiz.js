const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    timeLimit: {
        type: Number,
        default: 0,
        min: 0
    },
    passScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    settings: {
        randomizeQuestions: { type: Boolean, default: false },
        randomizeOptions: { type: Boolean, default: false },
        showFeedback: { type: Boolean, default: true },
        maxAttempts: { type: Number, default: 0 } // 0 means unlimited
    }
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
