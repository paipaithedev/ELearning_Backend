const Payment = require('../schema/Payment');
const Course = require('../schema/Course');
const Enrollment = require('../schema/Enrollment');
const User = require('../schema/User');
const Coupon = require('../schema/Coupon');
const { notifyAdmins } = require('../utils/notification');

exports.createManualPayment = async (req, res) => {
    try {
        const { courseId, amount, currency, paymentMethod, transactionId, proofScreenshot, couponCode } = req.body;

        if (!courseId || amount === undefined) {
            return res.status(400).json({ success: false, message: 'courseId and amount are required.' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const existingPending = await Payment.findOne({
            userId: req.user._id,
            courseId,
            status: 'pending'
        });

        if (existingPending) {
            return res.status(409).json({ success: false, message: 'You already have a pending payment for this course.' });
        }

        // If a coupon was applied, re-validate and atomically consume it
        let appliedCouponId = null;
        if (couponCode) {
            const coupon = await Coupon.findOneAndUpdate(
                {
                    code: couponCode.toUpperCase(),
                    isActive: true,
                    $and: [
                        { $or: [{ usageLimit: null }, { $expr: { $lt: ['$usageCount', '$usageLimit'] } }] },
                        { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }
                    ]
                },
                { $inc: { usageCount: 1 } },
                { new: true }
            );

            if (!coupon) {
                return res.status(400).json({ success: false, message: 'Coupon is no longer valid or has reached its usage limit.' });
            }
            appliedCouponId = coupon._id;
        }

        const payment = await Payment.create({
            userId: req.user._id,
            courseId,
            amount,
            currency: currency || 'MMK',
            paymentMethod: paymentMethod || 'manual',
            provider: 'manual',
            transactionId: transactionId || '',
            proofScreenshot: proofScreenshot || '',
            couponCode: couponCode ? couponCode.toUpperCase() : undefined,
            status: 'pending' // Manual payments always start as pending
        });

        // Notify Admins about manual payment
        await notifyAdmins('New Payment Received', `A student has submitted a manual payment of ${amount} ${currency || 'MMK'} for review.`);

        return res.status(201).json({
            success: true,
            message: 'Manual payment submitted successfully. Please wait for verification.',
            data: { payment }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to submit manual payment.',
            error: error.message
        });
    }
};

exports.createPayment = async (req, res) => {
    try {
        const { courseId, amount, currency, provider, transactionId, status } = req.body;

        if (!courseId || amount === undefined) {
            return res.status(400).json({ success: false, message: 'courseId and amount are required.' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const payment = await Payment.create({
            userId: req.user._id,
            courseId,
            amount,
            currency: currency || 'USD',
            provider: provider || 'manual',
            transactionId: transactionId || '',
            status: status || 'pending',
            paidAt: status === 'paid' ? new Date() : null
        });

        if (payment.status === 'paid') {
            await Enrollment.updateOne(
                { userId: req.user._id, courseId },
                { $setOnInsert: { userId: req.user._id, courseId } },
                { upsert: true }
            );
            
            // Notify Admins about success payment
            await notifyAdmins('Course Completion Goal: Payment Success', `${req.user.name} has paid for "${course.title}".`);
        }

        return res.status(201).json({
            success: true,
            message: 'Payment created.',
            data: { payment }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create payment.',
            error: error.message
        });
    }
};

exports.listPayments = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
        const skip = (page - 1) * limit;

        const { courseId } = req.query;
        const query = { userId: req.user._id };
        if (courseId) {
            query.courseId = courseId;
        }

        const [payments, total] = await Promise.all([
            Payment.find(query)
                .populate('courseId', 'title thumbnail')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Payment.countDocuments({ userId: req.user._id })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            message: 'Payments fetched.',
            data: { payments, count: payments.length, page, limit, total, totalPages }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payments.',
            error: error.message
        });
    }
};

exports.listAllPayments = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
        const skip = (page - 1) * limit;

        const { q } = req.query;
        let query = {};

        if (q) {
            // Since we need to search in populated fields, we might need a more complex approach 
            // but for simplicity and common practice, we search by transactionId or status first.
            // If we want to search by student name, we'd need to find users first or use aggregation.
            query = {
                $or: [
                    { transactionId: { $regex: q, $options: 'i' } },
                    { status: { $regex: q, $options: 'i' } },
                    { paymentMethod: { $regex: q, $options: 'i' } }
                ]
            };
        }

        const [payments, total] = await Promise.all([
            Payment.find(query)
                .populate('userId', 'name email avatar')
                .populate('courseId', 'title')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Payment.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            message: 'All payments fetched.',
            data: { payments, count: payments.length, page, limit, total, totalPages }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payments.',
            error: error.message
        });
    }
};

exports.verifyManualPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNote } = req.body;

        const payment = await Payment.findById(id);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found.' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Only pending payments can be verified.' });
        }

        payment.status = status; // 'paid' or 'failed'
        payment.adminNote = adminNote || '';
        if (status === 'paid') {
            payment.paidAt = new Date();
        }
        await payment.save();

        if (status === 'paid') {
            // Create enrollment if not already exists
            await Enrollment.findOneAndUpdate(
                { userId: payment.userId, courseId: payment.courseId },
                { $set: { status: 'active' } },
                { upsert: true, new: true }
            );

            // Sync User's enrolled courses array
            await User.findByIdAndUpdate(payment.userId, {
                $addToSet: { enrolledCourses: payment.courseId }
            });

            // Credit instructor balance
            const course = await Course.findById(payment.courseId);
            if (course) {
                const instructor = await User.findById(course.instructorId);
                if (instructor && instructor.role === 'instructor') {
                    const commissionRate = instructor.commissionRate || 70;
                    const instructorShare = (payment.amount * commissionRate) / 100;
                    instructor.balance += instructorShare;
                    await instructor.save();
                }
            }
        }

        // If payment is rejected and a coupon was used, refund the usage count
        if (status === 'failed' && payment.couponCode) {
            await Coupon.findOneAndUpdate(
                { code: payment.couponCode },
                { $inc: { usageCount: -1 } }
            );
        }

        return res.status(200).json({
            success: true,
            message: `Payment marked as ${status}.`,
            data: { payment }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to verify payment.',
            error: error.message
        });
    }
};
exports.verifyAllManualPayments = async (req, res) => {
    try {
        const pendingPayments = await Payment.find({ status: 'pending' });
        
        if (pendingPayments.length === 0) {
            return res.status(400).json({ success: false, message: 'No pending payments to verify.' });
        }

        let successCount = 0;
        let failCount = 0;

        for (const payment of pendingPayments) {
            try {
                payment.status = 'paid';
                payment.paidAt = new Date();
                await payment.save();

                // Create enrollment if not already exists
                await Enrollment.findOneAndUpdate(
                    { userId: payment.userId, courseId: payment.courseId },
                    { $set: { status: 'active' } },
                    { upsert: true }
                );

                // Sync User's enrolled courses array
                await User.findByIdAndUpdate(payment.userId, {
                    $addToSet: { enrolledCourses: payment.courseId }
                });

                // Credit instructor balance
                const course = await Course.findById(payment.courseId);
                if (course) {
                    const instructor = await User.findById(course.instructorId);
                    if (instructor && instructor.role === 'instructor') {
                        const commissionRate = instructor.commissionRate || 70;
                        const instructorShare = (payment.amount * commissionRate) / 100;
                        instructor.balance += instructorShare;
                        await instructor.save();
                    }
                }
                successCount++;
            } catch (err) {
                console.error(`[VerifyAll] Error processing payment ${payment._id}:`, err);
                failCount++;
            }
        }

        return res.status(200).json({
            success: true,
            message: `Batch verification completed. ${successCount} processed, ${failCount} failed.`,
            data: { successCount, failCount }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to perform bulk verification.',
            error: error.message
        });
    }
};
