const mongoose = require('mongoose');
const Progress = require('../schema/Progress');
const Lesson = require('../schema/Lesson');

exports.upsertProgress = async (req, res) => {
    try {
        const { lessonId, watchTime, lastPosition, isCompleted } = req.body;

        if (!lessonId) {
            return res.status(400).json({ success: false, message: 'lessonId is required.' });
        }

        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(404).json({ success: false, message: 'Lesson not found.' });
        }

        const update = {
            userId: req.user._id,
            courseId: lesson.courseId,
            lessonId: lesson._id
        };

        if (watchTime !== undefined) update.watchTime = watchTime;
        if (lastPosition !== undefined) update.lastPosition = lastPosition;
        if (isCompleted !== undefined) {
            update.isCompleted = Boolean(isCompleted);
            update.completedAt = update.isCompleted ? new Date() : null;
        }

        const progress = await Progress.findOneAndUpdate(
            { userId: req.user._id, lessonId: lesson._id },
            { $set: update },
            { new: true, upsert: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Progress updated.',
            data: { progress }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update progress.',
            error: error.message
        });
    }
};

exports.getCourseProgress = async (req, res) => {
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

        const progressList = await Progress.find({
            userId: req.user._id,
            courseId
        }).populate('lessonId');

        return res.status(200).json({
            success: true,
            message: 'Progress fetched.',
            data: { progress: progressList, count: progressList.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch progress.',
            error: error.message
        });
    }
};
