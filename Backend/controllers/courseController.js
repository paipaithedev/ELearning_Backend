const mongoose = require('mongoose');
const Course = require('../schema/Course');
const { notifyAdmins } = require('../utils/notification');

const makeSlug = (text) => {
    return String(text || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

const ensureUniqueSlug = async (baseSlug, excludeId) => {
    let slug = baseSlug;
    let counter = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const existing = await Course.findOne({ slug });
        if (!existing || String(existing._id) === String(excludeId)) {
            break;
        }
        counter += 1;
        slug = `${baseSlug}-${counter}`;
    }

    return slug;
};

exports.createCourse = async (req, res) => {
    try {
        const {
            title,
            description,
            shortDescription,
            thumbnail,
            previewVideo,
            price,
            discountPrice,
            level,
            language,
            categoryId,
            tags,
            requirements,
            outcomes,
            totalDuration,
            lessonsCount,
            isPublished
        } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Title is required.' });
        }

        const baseSlug = makeSlug(title);
        if (!baseSlug) {
            return res.status(400).json({ success: false, message: 'Invalid title.' });
        }

        const slug = await ensureUniqueSlug(baseSlug);

        const publishFlag = Boolean(isPublished);
        const course = await Course.create({
            title,
            slug,
            description,
            shortDescription,
            previewVideo,
            price,
            discountPrice,
            level,
            language,
            thumbnail,
            categoryId,
            tags,
            requirements,
            outcomes,
            totalDuration,
            lessonsCount,
            isPublished: publishFlag,
            publishedAt: publishFlag ? new Date() : null,
            instructorId: req.user._id
        });

        // Notify Admins about new course
        await notifyAdmins('New Course Created', `A new course "${title}" has been created and is awaiting review if unpublished.`);

        return res.status(201).json({
            success: true,
            message: 'Course created.',
            data: { course }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create course.',
            error: error.message
        });
    }
};

exports.listCourses = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
        const skip = (page - 1) * limit;

        const {
            q,
            categoryId,
            instructorId,
            level,
            language,
            minPrice,
            maxPrice,
            published
        } = req.query;

        const filter = {};

        if (q) {
            const regex = new RegExp(q.trim(), 'i');
            filter.$or = [
                { title: regex },
                { description: regex },
                { shortDescription: regex },
                { tags: regex }
            ];
        }

        if (categoryId) filter.categoryId = categoryId;
        if (instructorId) filter.instructorId = instructorId;
        if (level) filter.level = level;
        if (language) filter.language = language;

        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.price = {};
            if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
            if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
        }

        if (published !== undefined) {
            filter.isPublished = String(published).toLowerCase() === 'true';
        }

        const [courses, total] = await Promise.all([
            Course.aggregate([
                { $match: filter },
                {
                    $lookup: {
                        from: 'lessons',
                        localField: '_id',
                        foreignField: 'courseId',
                        as: 'lessons'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'instructorId',
                        foreignField: '_id',
                        as: 'instructor'
                    }
                },
                { $unwind: '$instructor' },
                {
                    $addFields: {
                        lessonsCount: { $size: '$lessons' },
                        totalDuration: { $sum: '$lessons.duration' },
                        instructorId: {
                            _id: '$instructor._id',
                            name: '$instructor.name',
                            avatar: '$instructor.avatar'
                        }
                    }
                },
                { $project: { lessons: 0, instructor: 0 } },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]),
            Course.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit);
        return res.status(200).json({
            success: true,
            message: 'Courses fetched.',
            data: {
                courses,
                count: courses.length,
                page,
                limit,
                total,
                totalPages
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch courses.',
            error: error.message
        });
    }
};

exports.getCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        // Use aggregation for dynamic counts
        const match = mongoose.Types.ObjectId.isValid(id) 
            ? { _id: new mongoose.Types.ObjectId(id) }
            : { slug: id };

        const results = await Course.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'lessons',
                    localField: '_id',
                    foreignField: 'courseId',
                    as: 'lessons'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'instructorId',
                    foreignField: '_id',
                    as: 'instructor'
                }
            },
            { $unwind: '$instructor' },
            {
                $addFields: {
                    lessonsCount: { $size: '$lessons' },
                    totalDuration: { $sum: '$lessons.duration' },
                    instructorId: {
                        _id: '$instructor._id',
                        name: '$instructor.name',
                        avatar: '$instructor.avatar'
                    }
                }
            },
            { $project: { lessons: 0, instructor: 0 } }
        ]);

        course = results[0];

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Course fetched.',
            data: { course }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch course.',
            error: error.message
        });
    }
};

exports.updateCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
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
            description,
            shortDescription,
            thumbnail,
            previewVideo,
            price,
            discountPrice,
            level,
            language,
            categoryId,
            tags,
            requirements,
            outcomes,
            totalDuration,
            lessonsCount,
            isPublished
        } = req.body;

        if (title !== undefined) {
            const baseSlug = makeSlug(title);
            if (!baseSlug) {
                return res.status(400).json({ success: false, message: 'Invalid title.' });
            }
            course.title = title;
            course.slug = await ensureUniqueSlug(baseSlug, course._id);
        }

        if (description !== undefined) course.description = description;
        if (shortDescription !== undefined) course.shortDescription = shortDescription;
        if (thumbnail !== undefined) course.thumbnail = thumbnail;
        if (previewVideo !== undefined) course.previewVideo = previewVideo;
        if (price !== undefined) course.price = price;
        if (discountPrice !== undefined) course.discountPrice = discountPrice;
        if (level !== undefined) course.level = level;
        if (language !== undefined) course.language = language;
        if (categoryId !== undefined) course.categoryId = categoryId;
        if (tags !== undefined) course.tags = tags;
        if (requirements !== undefined) course.requirements = requirements;
        if (outcomes !== undefined) course.outcomes = outcomes;
        if (totalDuration !== undefined) course.totalDuration = totalDuration;
        if (lessonsCount !== undefined) course.lessonsCount = lessonsCount;

        if (isPublished !== undefined) {
            const publishFlag = Boolean(isPublished);
            course.isPublished = publishFlag;
            course.publishedAt = publishFlag ? (course.publishedAt || new Date()) : null;
        }

        await course.save();

        return res.status(200).json({
            success: true,
            message: 'Course updated.',
            data: { course }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update course.',
            error: error.message
        });
    }
};

exports.deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const isAdmin = req.user.role === 'admin';
        const isOwner = String(course.instructorId) === String(req.user._id);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }

        await Course.findByIdAndDelete(course._id);

        return res.status(200).json({
            success: true,
            message: 'Course deleted.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete course.',
            error: error.message
        });
    }
};
