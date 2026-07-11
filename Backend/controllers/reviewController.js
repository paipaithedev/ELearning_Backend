const Review = require('../schema/Review');
const Course = require('../schema/Course');
const Enrollment = require('../schema/Enrollment');

const recalcCourseRating = async (courseId) => {
    const stats = await Review.aggregate([
        { $match: { courseId } },
        {
            $group: {
                _id: '$courseId',
                avg: { $avg: '$rating' },
                count: { $sum: 1 }
            }
        }
    ]);

    const ratingAverage = stats.length ? Number(stats[0].avg.toFixed(2)) : 0;
    const ratingCount = stats.length ? stats[0].count : 0;

    await Course.findByIdAndUpdate(courseId, { ratingAverage, ratingCount });
};

exports.createReview = async (req, res) => {
    try {
        const { courseId, rating, comment } = req.body;

        if (!courseId || !rating) {
            return res.status(400).json({ success: false, message: 'courseId and rating are required.' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const enrolled = await Enrollment.findOne({ userId: req.user._id, courseId });
        if (!enrolled) {
            return res.status(403).json({ success: false, message: 'You must be enrolled to review this course.' });
        }

        const existing = await Review.findOne({ userId: req.user._id, courseId });
        if (existing) {
            return res.status(409).json({ success: false, message: 'You already reviewed this course.' });
        }

        const review = await Review.create({
            userId: req.user._id,
            courseId,
            rating,
            comment
        });

        await recalcCourseRating(course._id);

        return res.status(201).json({
            success: true,
            message: 'Review created.',
            data: { review }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create review.',
            error: error.message
        });
    }
};

exports.listReviewsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const reviews = await Review.find({ courseId }).populate('userId', 'name avatar');

        return res.status(200).json({
            success: true,
            message: 'Reviews fetched.',
            data: { reviews, count: reviews.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews.',
            error: error.message
        });
    }
};

exports.listAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('userId', 'name avatar email')
            .populate('courseId', 'title')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'All reviews fetched.',
            data: { reviews, count: reviews.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews.',
            error: error.message
        });
    }
};

exports.deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await Review.findById(id);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }

        const courseId = review.courseId;
        await review.deleteOne();
        await recalcCourseRating(courseId);

        return res.status(200).json({
            success: true,
            message: 'Review deleted.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete review.',
            error: error.message
        });
    }
};
