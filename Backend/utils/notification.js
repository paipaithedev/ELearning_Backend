const admin = require('./firebase');
const User = require('../schema/User');

/**
 * Sends a notification to all administrators who have registered an FCM token.
 */
exports.notifyAdmins = async (title, body, data = {}) => {
    try {
        // Check if Firebase was successfully initialized
        if (admin.apps.length === 0) {
            console.log('[Notification] Firebase Admin not initialized. Skipping push notification.');
            return;
        }

        // Find all admins with an FCM token
        const admins = await User.find({ role: 'admin', fcmToken: { $exists: true, $ne: '' } });
        console.log(`[Notification] Found ${admins.length} admins with FCM tokens in database.`);
        
        const tokens = admins.map(u => {
            console.log(`[Notification] Admin: ${u.email}, Token: ${u.fcmToken.substring(0, 10)}...`);
            return u.fcmToken;
        });

        if (tokens.length === 0) {
            console.log('[Notification] No admin device tokens found.');
            return;
        }

        const message = {
            notification: { title, body },
            data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Successfully sent ${response.successCount} notifications. Total attempted: ${tokens.length}`);
        
        if (response.failureCount > 0) {
            console.log(`Failed to send to ${response.failureCount} tokens.`);
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`[Notification Error] Token ${tokens[idx].substring(0, 10)}... failed:`, resp.error.message);
                }
            });
        }
    } catch (error) {
        console.error('Error sending admin notification:', error);
    }
};

/**
 * Generic function to send notification to any user by ID.
 */
exports.notifyUser = async (userId, title, body, data = {}) => {
    try {
        if (admin.apps.length === 0) return;

        const user = await User.findById(userId);
        if (!user || !user.fcmToken) return;

        const message = {
            notification: { title, body },
            data,
            token: user.fcmToken
        };

        await admin.messaging().send(message);
    } catch (error) {
        console.error(`Error sending notification to user ${userId}:`, error);
    }
};

/**
 * Broadcasts a notification to all users who have registered an FCM token.
 */
exports.notifyAll = async (title, body, data = {}) => {
    try {
        if (admin.apps.length === 0) return;

        const users = await User.find({ fcmToken: { $exists: true, $ne: '' } });
        const tokens = users.map(u => u.fcmToken);

        if (tokens.length === 0) return;

        const message = {
            notification: { title, body },
            data: { ...data, type: 'announcement' },
            tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Successfully broadcasted ${response.successCount} notifications.`);
    } catch (error) {
        console.error('Error broadcasting notification:', error);
    }
};
