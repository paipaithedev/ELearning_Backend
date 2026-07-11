const mongoose = require('mongoose');
const Enrollment = require('../schema/Enrollment');
const User = require('../schema/User');
const Course = require('../schema/Course');
const { notifyAdmins } = require('../utils/notification');

exports.enroll = async (req, res) => {
    try {
        let { courseId } = req.body;

        if (!courseId) {
            return res.status(400).json({ success: false, message: 'courseId is required.' });
        }

        let course;
        // Try find by ID first, then by Slug
        if (mongoose.Types.ObjectId.isValid(courseId)) {
            course = await Course.findById(courseId);
        }

        if (!course) {
            course = await Course.findOne({ slug: courseId });
        }

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const existing = await Enrollment.findOne({
            userId: req.user._id,
            courseId: course._id
        });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Already enrolled.' });
        }

        const enrollment = await Enrollment.create({
            userId: req.user._id,
            courseId: course._id
        });

        await Course.findByIdAndUpdate(course._id, { $inc: { enrolledCount: 1 } });
        
        // Sync User's enrolled courses array
        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { enrolledCourses: course._id }
        });
        
        // Notify Admins about new enrollment
        await notifyAdmins('New Course Enrollment', `${req.user.name} has enrolled in "${course.title}".`);

        return res.status(201).json({
            success: true,
            message: 'Enrolled successfully.',
            data: { enrollment }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Enrollment failed.',
            error: error.message
        });
    }
};

exports.myEnrollments = async (req, res) => {
    try {
        console.log(`[DEBUG] myEnrollments for User: ${req.user._id} (${req.user.email}), Page: ${req.query.page || 1}`);

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
        const skip = (page - 1) * limit;

        const [enrollments, total] = await Promise.all([
            Enrollment.find({ userId: req.user._id })
                .populate('courseId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Enrollment.countDocuments({ userId: req.user._id })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            message: 'Enrollments fetched.',
            data: {
                enrollments,
                count: enrollments.length,
                page,
                limit,
                total,
                totalPages
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch enrollments.',
            error: error.message
        });
    }
};

exports.adminListEnrollments = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
        const skip = (page - 1) * limit;

        const { q } = req.query;
        let query = {};

        if (q) {
            query = {
                $or: [
                    { status: { $regex: q, $options: 'i' } }
                ]
            };
        }

        const [enrollments, total] = await Promise.all([
            Enrollment.find(query)
                .populate('userId', 'name email avatar')
                .populate('courseId', 'title')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Enrollment.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            message: 'Enrollments fetched.',
            data: {
                enrollments,
                count: enrollments.length,
                page,
                limit,
                total,
                totalPages
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch enrollments.',
            error: error.message
        });
    }
};

exports.adminDeleteEnrollment = async (req, res) => {
    try {
        const enrollment = await Enrollment.findByIdAndDelete(req.params.id);
        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found.' });
        }
        await Course.findByIdAndUpdate(enrollment.courseId, { $inc: { enrolledCount: -1 } });
        return res.status(200).json({ success: true, message: 'Enrollment deleted.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Delete failed.', error: error.message });
    }
};
exports.checkEnrollment = async (req, res) => {
    try {
        let { courseId } = req.params;

        // Resolve slug to ID if necessary
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            const course = await Course.findOne({ slug: courseId });
            if (course) {
                courseId = course._id;
            } else {
                return res.status(404).json({ success: false, message: 'Course not found.' });
            }
        }

        const enrollment = await Enrollment.findOne({
            userId: req.user._id,
            courseId,
            status: { $in: ['active', 'completed'] }
        });

        // Check authorization
        const course = await Course.findById(courseId);
        const isAdmin = req.user.role === 'admin';
        const isInstructor = course && String(course.instructorId?._id || course.instructorId) === String(req.user._id);
        const isAuthorized = isAdmin || isInstructor;

        return res.status(200).json({
            success: true,
            data: {
                isEnrolled: Boolean(enrollment) || isAuthorized,
                status: enrollment ? enrollment.status : (isAuthorized ? 'active' : null),
                enrollment
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to check enrollment.',
            error: error.message
        });
    }
};
