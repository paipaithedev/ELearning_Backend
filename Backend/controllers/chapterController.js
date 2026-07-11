const mongoose = require('mongoose');
const Chapter = require('../schema/Chapter');
const Course = require('../schema/Course');
const Enrollment = require('../schema/Enrollment');

exports.createChapter = async (req, res) => {
    try {
        const { courseId, title, order } = req.body;

        if (!courseId || !title) {
            return res.status(400).json({ success: false, message: 'courseId and title are required.' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const isAdmin = req.user.role === 'admin';
        const isOwner = String(course.instructorId) === String(req.user._id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }

        const chapter = await Chapter.create({
            courseId,
            title,
            order: order || 0
        });

        return res.status(201).json({
            success: true,
            message: 'Chapter created.',
            data: { chapter }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create chapter.',
            error: error.message
        });
    }
};

const Lesson = require('../schema/Lesson');

exports.listChaptersByCourse = async (req, res) => {
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

        const chapters = await Chapter.find({ courseId }).sort({ order: 1, createdAt: 1 });

        let isEnrolled = false;
        let isAuthorized = false;

        if (req.user) {
            const enrollment = await Enrollment.findOne({
                userId: req.user._id,
                courseId,
                status: { $in: ['active', 'completed'] }
            });
            
            const course = await Course.findById(courseId); 
            const isAdmin = req.user.role === 'admin';
            const isInstructor = course && String(course.instructorId?._id || course.instructorId) === String(req.user._id);
            isAuthorized = isAdmin || isInstructor;

            isEnrolled = Boolean(enrollment) || isAuthorized;
        }

        // Fetch lessons for all these chapters
        const chapterIds = chapters.map(ch => ch._id);
        const allLessons = await Lesson.find({ chapterId: { $in: chapterIds } }).sort({ order: 1, createdAt: 1 });

        // Embed filtered safe lessons into each chapter
        const chaptersWithLessons = chapters.map(ch => {
            const chObj = ch.toObject();
            const chapterLessons = allLessons.filter(l => String(l.chapterId) === String(ch._id));

            chObj.lessons = chapterLessons.map((lesson) => {
                if (lesson.isPreview || isEnrolled || isAuthorized) {
                    return lesson;
                }
                return {
                    _id: lesson._id,
                    courseId: lesson.courseId,
                    chapterId: lesson.chapterId,
                    title: lesson.title,
                    lessonType: lesson.lessonType,
                    duration: lesson.duration,
                    order: lesson.order,
                    isPreview: lesson.isPreview
                };
            });

            return chObj;
        });

        return res.status(200).json({
            success: true,
            message: 'Chapters fetched.',
            data: { chapters: chaptersWithLessons, count: chapters.length, isEnrolled }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch chapters.',
            error: error.message
        });
    }
};

exports.updateChapter = async (req, res) => {
    try {
        const chapter = await Chapter.findById(req.params.id);
        if (!chapter) {
            return res.status(404).json({ success: false, message: 'Chapter not found.' });
        }

        const course = await Course.findById(chapter.courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const isAdmin = req.user.role === 'admin';
        const isOwner = String(course.instructorId) === String(req.user._id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }

        const { title, order } = req.body;
        if (title !== undefined) chapter.title = title;
        if (order !== undefined) chapter.order = order;

        await chapter.save();

        return res.status(200).json({
            success: true,
            message: 'Chapter updated.',
            data: { chapter }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update chapter.',
            error: error.message
        });
    }
};

exports.deleteChapter = async (req, res) => {
    try {
        const chapter = await Chapter.findById(req.params.id);
        if (!chapter) {
            return res.status(404).json({ success: false, message: 'Chapter not found.' });
        }

        const course = await Course.findById(chapter.courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const isAdmin = req.user.role === 'admin';
        const isOwner = String(course.instructorId) === String(req.user._id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }

        await Chapter.findByIdAndDelete(chapter._id);

        return res.status(200).json({
            success: true,
            message: 'Chapter deleted.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete chapter.',
            error: error.message
        });
    }
};
