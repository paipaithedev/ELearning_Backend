const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    score: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    passed: {
        type: Boolean,
        default: false
    },
    earnedPoints: {
        type: Number,
        default: 0
    },
    totalPoints: {
        type: Number,
        default: 0
    },
    // Store the student's raw answers for review
    answers: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    finishedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Index for fast student history lookups
quizAttemptSchema.index({ userId: 1, quizId: 1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
