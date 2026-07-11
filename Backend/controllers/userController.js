const User = require('../schema/User');
const { sendEmail } = require('../utils/email');

exports.adminCreateUser = async (req, res) => {
    try {
        const { name, email, password, role, status } = req.body;

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(409).json({
                success: false,
                message: 'A user with this email already exists.'
            });
        }

        const user = new User({
            name,
            email,
            passwordHash: password, // pre-save hook will hash it
            role: role || 'student',
            status: status || 'active',
            isVerified: true        // admin-created accounts skip email verification
        });

        await user.save();

        // Return user without passwordHash
        const created = await User.findById(user._id);

        return res.status(201).json({
            success: true,
            message: 'User created successfully.',
            data: { user: created }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create user.',
            error: error.message
        });
    }
};

exports.editUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('+passwordHash');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const { name, email, password, isVerified } = req.body;

        // Check email uniqueness only if changing email
        if (email && email !== user.email) {
            const taken = await User.findOne({ email });
            if (taken) {
                return res.status(409).json({
                    success: false,
                    message: 'This email is already in use by another account.'
                });
            }
        }

        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (isVerified !== undefined) user.isVerified = isVerified;

        // Only update password if explicitly provided
        if (password) {
            user.passwordHash = password; // pre-save hook will re-hash
        }

        await user.save();

        const updated = await User.findById(user._id);
        return res.status(200).json({
            success: true,
            message: 'User updated successfully.',
            data: { user: updated }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update user.',
            error: error.message
        });
    }
};


exports.listUsers = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
        const skip = (page - 1) * limit;

        const query = {};
        if (req.query.search) {
            query.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const [users, total] = await Promise.all([
            User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            User.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            message: 'Users fetched.',
            data: { users, count: users.length, page, limit, total, totalPages }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch users.',
            error: error.message
        });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ success: false, message: 'role is required.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        user.role = role;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'User role updated.',
            data: { user }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update role.',
            error: error.message
        });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, message: 'status is required.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        user.status = status;

        // Auto-verify if an admin manually sets them to 'active'
        if (status === 'active' && !user.isVerified) {
            user.isVerified = true;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'User status updated.',
            data: { user }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update status.',
            error: error.message
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        await User.findByIdAndDelete(user._id);

        return res.status(200).json({
            success: true,
            message: 'User deleted.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete user.',
            error: error.message
        });
    }
};

exports.verifyUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // If there's a pending email change, apply it now
        if (user.pendingEmail) {
            user.email = user.pendingEmail;
            user.pendingEmail = '';
        }

        user.isVerified = true;
        let message = 'User verified.';
        if (user.status === 'pending') {
            user.status = 'active';
            message = 'User verified and activated.';
        }
        await user.save();

        try {
            await sendEmail({
                to: user.email,
                subject: 'Your E-Learning account is approved',
                text: `Hi ${user.name}, your account has been approved and you can now sign in.`,
                html: `
                    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e0e7ff;border-radius:8px">
                        <h2 style="color:#3730a3">Account Approved</h2>
                        <p>Hi <strong>${user.name}</strong>, your registration has been approved by our team.</p>
                        <p>You can now sign in and start learning.</p>
                        <a href="${process.env.APP_URL || 'http://localhost:5173'}/login" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Sign In</a>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Approval email failed:', emailError);
        }

        return res.status(200).json({ success: true, message, data: { user } });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to verify user.', error: error.message });
    }
};

exports.updateFcmToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ success: false, message: 'fcmToken is required.' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        user.fcmToken = fcmToken;
        await user.save();

        return res.status(200).json({ success: true, message: 'FCM token updated.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update FCM token.', error: error.message });
    }
};

exports.testPush = async (req, res) => {
    try {
        const { notifyUser } = require('../utils/notification');
        await notifyUser(req.user._id, '🔔 Test Notification', 'If you see this, real-time push is working!');
        return res.status(200).json({ success: true, message: 'Test notification sent.' });
    } catch (error) {
        console.error('Test push error:', error);
        return res.status(500).json({ success: false, message: 'Failed to send test push.' });
    }
};
        
