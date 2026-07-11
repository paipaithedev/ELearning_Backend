const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    prompt: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['mcq', 'multi_select', 'true_false', 'short_answer'],
        default: 'mcq'
    },
    options: [{
        text: { type: String, required: true },
        isCorrect: { type: Boolean, default: false } // For multi_select support
    }],
    correctIndex: {
        type: Number,
        default: 0 // Still used for simple MCQ
    },
    points: {
        type: Number,
        default: 1,
        min: 0
    },
    explanation: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
