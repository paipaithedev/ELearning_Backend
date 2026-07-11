const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    shortDescription: {
        type: String,
        default: ''
    },
    thumbnail: {
        type: String,
        default: ''
    },
    previewVideo: {
        type: String,
        default: ''
    },
    videoSource: {
        type: String,
        enum: ['local', 'external'],
        default: 'local'
    },
    price: {
        type: Number,
        default: 0,
        min: 0
    },
    discountPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    language: {
        type: String,
        default: 'en'
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    tags: [{
        type: String,
        trim: true
    }],
    requirements: [{
        type: String,
        trim: true
    }],
    outcomes: [{
        type: String,
        trim: true
    }],
    totalDuration: {
        type: Number,
        default: 0,
        min: 0
    },
    lessonsCount: {
        type: Number,
        default: 0,
        min: 0
    },
    enrolledCount: {
        type: Number,
        default: 0,
        min: 0
    },
    ratingAverage: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    ratingCount: {
        type: Number,
        default: 0,
        min: 0
    },
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    publishedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
