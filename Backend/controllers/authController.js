const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../schema/User');
const { sendEmail } = require('../utils/email');
const { notifyAdmins } = require('../utils/notification'); // Added this line

const signToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES || '7d' }
    );
};

const sanitizeUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    isVerified: user.isVerified,
    status: user.status,
    pendingEmail: user.pendingEmail
});

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email already in use.' });
        }

        const user = await User.create({
            name,
            email: normalizedEmail,
            passwordHash: password
        });

        // Fire and forget so registration does not block on push delivery.
        notifyAdmins('New User Registered', `A new user ${user.name} (${user.email}) has joined the platform.`);

        // Send email verification link
        const verifyToken = user.createEmailVerificationToken();
        await user.save({ validateBeforeSave: false });

        const verifyUrl = `${process.env.APP_URL || 'http://localhost:5173'}/verify-email?token=${verifyToken}`;

        if (process.env.EMAIL_FROM && process.env.SMTP_HOST) {
            void sendEmail({
                to: user.email,
                subject: 'Verify your E-Learning account',
                text: `Hi ${user.name}, please verify your email by visiting: ${verifyUrl}`,
                html: `
                    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e0e7ff;border-radius:8px">
                        <h2 style="color:#3730a3">Welcome to E-Learning! 🎉</h2>
                        <p>Hi <strong>${user.name}</strong>, thanks for registering.</p>
                        <p>Please click the button below to verify your email address. This link expires in <strong>24 hours</strong>.</p>
                        <a href="${verifyUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Verify Email</a>
                        <p style="color:#6b7280;font-size:0.85rem">If you did not create an account, you can safely ignore this email.</p>
                    </div>
                `
            }).catch((emailError) => {
                console.error('Registration email failed:', emailError);
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Registration submitted. Please verify your email and wait for admin approval.',
            data: { user: sanitizeUser(user) }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Registration failed.',
            error: error.message
        });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ success: false, message: 'Verification token is required.' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Token is invalid or has expired.' });
        }

        user.isVerified = true;
        user.emailVerificationToken = '';
        user.emailVerificationExpires = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: user.status === 'pending'
                ? 'Email verified successfully. Your account is now waiting for admin approval.'
                : 'Email verified successfully! Your account is now active.',
            data: { user: sanitizeUser(user) }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Email verification failed.',
            error: error.message
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email first.'
            });
        }

        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Your account is waiting for admin approval.'
            });
        }

        const token = signToken(user);
        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            data: { token, user: sanitizeUser(user) }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Login failed.',
            error: error.message
        });
    }
};

exports.me = async (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Profile fetched.',
        data: { user: sanitizeUser(req.user) }
    });
};

exports.updateMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+passwordHash');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const { name, email, password, bio, avatar } = req.body;

        if (email && email !== user.email) {
            const taken = await User.findOne({ email });
            if (taken) {
                return res.status(409).json({ success: false, message: 'This email is already in use.' });
            }
            user.pendingEmail = email;
            user.isVerified = false; // Require re-verification/approval

            // Notify Admins about email change request
            notifyAdmins('Email Change Request', `${user.name} is requesting to change their email from ${user.email} to ${email}.`);
        }

        if (name !== undefined) user.name = name;
        if (bio !== undefined) user.bio = bio;
        if (avatar !== undefined) user.avatar = avatar;

        if (password) {
            user.passwordHash = password;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully.',
            data: { user: sanitizeUser(user) }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update profile.',
            error: error.message
        });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If the email exists, a reset token has been sent.'
            });
        }

        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        if (process.env.EMAIL_FROM && process.env.SMTP_HOST) {
            await sendEmail({
                to: user.email,
                subject: 'Password reset',
                text: `Use this link to reset your password: ${resetUrl}`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'If the email exists, a reset token has been sent.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to process password reset.',
            error: error.message
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: 'token and newPassword are required.' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Token is invalid or expired.' });
        }

        user.passwordHash = newPassword;
        user.passwordResetToken = '';
        user.passwordResetExpires = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password reset successful.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to reset password.',
            error: error.message
        });
    }
};
