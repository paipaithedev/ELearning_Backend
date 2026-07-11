const Conversation = require('../schema/Conversation');
const Message = require('../schema/Message');
const User = require('../schema/User');

exports.sendMessage = async (req, res) => {
    try {
        const { text, conversationId, studentId } = req.body;
        const senderId = req.user._id;
        const isSenderAdmin = req.user.role === 'admin';

        let conversation;

        if (conversationId) {
            conversation = await Conversation.findById(conversationId);
        } else if (!isSenderAdmin) {
            // Student sending a message, find or create their unique conversation
            conversation = await Conversation.findOneAndUpdate(
                { studentId: senderId },
                { $setOnInsert: { studentId: senderId } },
                { new: true, upsert: true }
            );
        } else if (isSenderAdmin && studentId) {
            // Admin starting/replying via studentId
            conversation = await Conversation.findOneAndUpdate(
                { studentId },
                { $setOnInsert: { studentId } },
                { new: true, upsert: true }
            );
        }

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found.' });
        }

        // Create the message
        const message = await Message.create({
            conversationId: conversation._id,
            senderId,
            text
        });

        // Update conversation metadata
        const updateData = {
            lastMessage: text,
            lastMessageAt: Date.now(),
            status: 'open'
        };

        if (isSenderAdmin) {
            updateData.$inc = { unreadCountStudent: 1 };
        } else {
            updateData.$inc = { unreadCountAdmin: 1 };
        }

        await Conversation.findByIdAndUpdate(conversation._id, updateData);

        return res.status(201).json({
            success: true,
            message: 'Message sent.',
            data: { message }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to send message.',
            error: error.message
        });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found.' });
        }

        // Check permission: Admin or the student themselves
        if (req.user.role !== 'admin' && conversation.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 })
            .populate('senderId', 'name avatar role');

        // Mark as read when fetched
        if (req.user.role === 'admin') {
            await Conversation.findByIdAndUpdate(conversationId, { unreadCountAdmin: 0 });
        } else {
            await Conversation.findByIdAndUpdate(conversationId, { unreadCountStudent: 0 });
        }

        return res.status(200).json({
            success: true,
            message: 'Messages fetched.',
            data: { messages }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch messages.',
            error: error.message
        });
    }
};

exports.getMyConversation = async (req, res) => {
    try {
        const conversation = await Conversation.findOne({ studentId: req.user._id });
        
        if (!conversation) {
            return res.status(200).json({
                success: true,
                message: 'No conversation found.',
                data: { conversation: null }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Conversation fetched.',
            data: { conversation }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch conversation.',
            error: error.message
        });
    }
};

exports.listConversations = async (req, res) => {
    try {
        // Admin only
        const conversations = await Conversation.find()
            .populate('studentId', 'name email avatar')
            .sort({ lastMessageAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Conversations fetched.',
            data: { conversations, count: conversations.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch conversations.',
            error: error.message
        });
    }
};

exports.closeConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        await Conversation.findByIdAndUpdate(conversationId, { status: 'closed' });

        return res.status(200).json({
            success: true,
            message: 'Conversation closed.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to close conversation.',
            error: error.message
        });
    }
};
