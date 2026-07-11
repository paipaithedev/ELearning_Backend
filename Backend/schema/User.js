const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    pendingEmail: {
        type: String,
        default: ''
    },
    passwordHash: {
        type: String,
        required: true,
        select: false
    },
    role: {
        type: String,
        enum: ['student', 'instructor', 'admin'],
        default: 'student'
    },
    enrolledCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    avatar: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'pending', 'inactive', 'suspended', 'banned'],
        default: 'pending'
    },
    passwordResetToken: {
        type: String,
        default: ''
    },
    passwordResetExpires: {
        type: Date,
        default: null
    },
    emailVerificationToken: {
        type: String,
        default: ''
    },
    emailVerificationExpires: {
        type: Date,
        default: null
    },
    balance: {
        type: Number,
        default: 0
    },
    commissionRate: {
        type: Number,
        default: 70 // 70% goes to instructor by default
    },
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    fcmToken: {
        type: String,
        default: ''
    }
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (!this.isModified('passwordHash')) {
        return;
    }
    const saltRounds = 10;
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
});

userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.createPasswordResetToken = function () {
    const rawToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    this.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    return rawToken;
};

userSchema.methods.createEmailVerificationToken = function () {
    const rawToken = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    return rawToken;
};

module.exports = mongoose.model('User', userSchema);
