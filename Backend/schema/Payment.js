const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'MMK' // Defaulting to MMK for localized context
    },
    paymentMethod: {
        type: String,
        enum: ['kbz_pay', 'aya_pay', 'wave_money', 'a_plus', 'bank_transfer', 'cash', 'stripe', 'paypal', 'manual'],
        default: 'manual'
    },
    proofScreenshot: {
        type: String,
        default: ''
    },
    provider: {
        type: String,
        default: 'manual'
    },
    transactionId: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    adminNote: {
        type: String,
        default: ''
    },
    couponCode: {
        type: String,
        default: null
    },
    paidAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
