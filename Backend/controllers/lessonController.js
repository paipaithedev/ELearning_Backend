const Lesson = require('../schema/Lesson');
const Chapter = require('../schema/Chapter');
const Course = require('../schema/Course');
const Enrollment = require('../schema/Enrollment');

exports.createLesson = async (req, res) => {
    try {
        const {
            courseId,
            chapterId,
            title,
            content,
            videoUrl,
            lessonType,
            duration,
            order,
            isPreview
        } = req.body;

        if (!courseId || !chapterId || !title) {
            return res.status(400).json({ success: false, message: 'courseId, chapterId, and title are required.' });
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

        const chapter = await Chapter.findById(chapterId);
        if (!chapter || String(chapter.courseId) !== String(courseId)) {
            return res.status(404).json({ success: false, message: 'Chapter not found for this course.' });
        }

        const lesson = await Lesson.create({
            courseId,
            chapterId,
            title,
            content,
            videoUrl,
            lessonType,
            duration,
            order: order || 0,
            isPreview: Boolean(isPreview)
        });

        // Update Course totals
        await Course.findByIdAndUpdate(courseId, {
            $inc: { 
                lessonsCount: 1, 
                totalDuration: duration || 0 
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Lesson created.',
            data: { lesson }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create lesson.',
            error: error.message
        });
    }
};

exports.listLessonsByChapter = async (req, res) => {
    try {
        const { chapterId } = req.params;

        const chapter = await Chapter.findById(chapterId);
        if (!chapter) {
            return res.status(404).json({ success: false, message: 'Chapter not found.' });
        }

        const lessons = await Lesson.find({ chapterId }).sort({ order: 1, createdAt: 1 });

        let isEnrolled = false;
        let isAuthorized = false;

        if (req.user) {
            // Check enrollment
            const enrollment = await Enrollment.findOne({
                userId: req.user._id,
                courseId: chapter.courseId,
                status: { $in: ['active', 'completed'] }
            });

            // Check if admin or instructor
            const course = await Course.findById(chapter.courseId);
            const isAdmin = req.user.role === 'admin';
            const isInstructor = course && String(course.instructorId?._id || course.instructorId) === String(req.user._id);
            isAuthorized = isAdmin || isInstructor;

            isEnrolled = Boolean(enrollment) || isAuthorized;
        }

        const safeLessons = lessons.map((lesson) => {
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

        return res.status(200).json({
            success: true,
            message: 'Lessons fetched.',
            data: { lessons: safeLessons, count: lessons.length, isEnrolled }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch lessons.',
            error: error.message
        });
    }
};

exports.updateLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) {
            return res.status(404).json({ success: false, message: 'Lesson not found.' });
        }

        const course = await Course.findById(lesson.courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const isAdmin = req.user.role === 'admin';
        const isOwner = String(course.instructorId) === String(req.user._id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }

        const {
            title,
            content,
            videoUrl,
            lessonType,
            duration,
            order,
            isPreview
        } = req.body;

        const oldDuration = lesson.duration || 0;

        if (title !== undefined) lesson.title = title;
        if (content !== undefined) lesson.content = content;
        if (videoUrl !== undefined) lesson.videoUrl = videoUrl;
        if (lessonType !== undefined) lesson.lessonType = lessonType;
        if (duration !== undefined) lesson.duration = duration;
        if (order !== undefined) lesson.order = order;
        if (isPreview !== undefined) lesson.isPreview = Boolean(isPreview);

        await lesson.save();

        // If duration changed, update course total duration
        if (duration !== undefined && duration !== oldDuration) {
            await Course.findByIdAndUpdate(lesson.courseId, {
                $inc: { totalDuration: duration - oldDuration }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lesson updated.',
            data: { lesson }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update lesson.',
            error: error.message
        });
    }
};

exports.deleteLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) {
            return res.status(404).json({ success: false, message: 'Lesson not found.' });
        }

        const course = await Course.findById(lesson.courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const isAdmin = req.user.role === 'admin';
        const isOwner = String(course.instructorId) === String(req.user._id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }

        await Lesson.findByIdAndDelete(lesson._id);

        // Update Course totals
        await Course.findByIdAndUpdate(lesson.courseId, {
            $inc: { 
                lessonsCount: -1, 
                totalDuration: -(lesson.duration || 0) 
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Lesson deleted.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete lesson.',
            error: error.message
        });
    }
};
