const Payout = require('../schema/Payout');
const User = require('../schema/User');

exports.requestPayout = async (req, res) => {
    try {
        const { amount, paymentMethod, paymentDetails } = req.body;
        
        if (!amount || !paymentMethod || !paymentDetails) {
            return res.status(400).json({ success: false, message: 'Amount, method, and details are required.' });
        }

        const user = await User.findById(req.user._id);
        if (user.balance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance.' });
        }

        // Deduct balance immediately to "escrow" it
        user.balance -= amount;
        await user.save();

        const payout = await Payout.create({
            instructorId: req.user._id,
            amount,
            paymentMethod,
            paymentDetails
        });

        return res.status(201).json({
            success: true,
            message: 'Payout requested successfully.',
            data: { payout }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to request payout.',
            error: error.message
        });
    }
};

exports.listMyPayouts = async (req, res) => {
    try {
        const payouts = await Payout.find({ instructorId: req.user._id })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Your payouts fetched.',
            data: { payouts, count: payouts.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch your payouts.',
            error: error.message
        });
    }
};

exports.listAllPayouts = async (req, res) => {
    try {
        const payouts = await Payout.find()
            .populate('instructorId', 'name email avatar balance')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Payouts fetched.',
            data: { payouts, count: payouts.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payouts.',
            error: error.message
        });
    }
};

exports.processPayout = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNote } = req.body; // 'approved' or 'rejected'

        const payout = await Payout.findById(id);
        if (!payout) {
            return res.status(404).json({ success: false, message: 'Payout not found.' });
        }

        if (payout.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Payout already processed.' });
        }

        if (status === 'rejected') {
            // Refund balance to instructor
            const instructor = await User.findById(payout.instructorId);
            if (instructor) {
                instructor.balance += payout.amount;
                await instructor.save();
            }
        }

        payout.status = status;
        payout.adminNote = adminNote || '';
        if (status === 'approved') {
            payout.processedAt = new Date();
        }
        await payout.save();

        return res.status(200).json({
            success: true,
            message: `Payout ${status}.`,
            data: { payout }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to process payout.',
            error: error.message
        });
    }
};
