const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../schema/User');
const Category = require('../schema/Category');
const Course = require('../schema/Course');
const Chapter = require('../schema/Chapter');
const Lesson = require('../schema/Lesson');

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

const makeSlug = (text) =>
    String(text || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

const seed = async () => {
    if (!MONGO_URI) {
        throw new Error('MONGO_URI is required');
    }

    await mongoose.connect(MONGO_URI);

    const shouldWipe = process.argv.includes('--wipe');
    if (shouldWipe) {
        await Promise.all([
            User.deleteMany({}),
            Category.deleteMany({}),
            Course.deleteMany({}),
            Chapter.deleteMany({}),
            Lesson.deleteMany({})
        ]);
    }

    const [admin, instructor, student] = await Promise.all([
        User.create({
            name: 'Admin',
            email: 'admin@gmail.com',
            passwordHash: 'admin123',
            role: 'admin'
        }),
        User.create({
            name: 'Instructor',
            email: 'instructor@gmail.com',
            passwordHash: 'instructor123',
            role: 'instructor'
        }),
        User.create({
            name: 'Student',
            email: 'student@gmail.com',
            passwordHash: 'student123',
            role: 'student'
        })
    ]);

    const programming = await Category.create({
        name: 'Programming',
        slug: 'programming'
    });

    const webDev = await Category.create({
        name: 'Web Development',
        slug: 'web-development',
        parentId: programming._id
    });

    const courseA = await Course.create(x{
        title: 'Node.js for Beginners',
        slug: makeSlug('Node.js for Beginners'),
        shortDescription: 'Learn Node.js from scratch.',
        description: 'A practical beginner course for building APIs with Node.js.',
        price: 49,
        level: 'beginner',
        language: 'en',
        categoryId: webDev._id,
        tags: ['node', 'api'],
        requirements: ['Basic JavaScript'],
        outcomes: ['Build REST APIs'],
        isPublished: true,
        publishedAt: new Date(),
        instructorId: instructor._id
    });

    const chapter1 = await Chapter.create({
        courseId: courseA._id,
        title: 'Getting Started',
        order: 1
    });

    const chapter2 = await Chapter.create({
        courseId: courseA._id,
        title: 'Building APIs',
        order: 2
    });

    await Lesson.create([
        {
            courseId: courseA._id,
            chapterId: chapter1._id,
            title: 'Introduction',
            content: 'Welcome to the course.',
            lessonType: 'text',
            order: 1,
            isPreview: true
        },
        {
            courseId: courseA._id,
            chapterId: chapter1._id,
            title: 'Setup',
            lessonType: 'video',
            duration: 300,
            order: 2,
            isPreview: true
        },
        {
            courseId: courseA._id,
            chapterId: chapter2._id,
            title: 'Express Basics',
            lessonType: 'video',
            duration: 600,
            order: 1,
            isPreview: false
        }
    ]);

    await mongoose.disconnect();

    console.log('Seed completed.');
    console.log('Users:', {
        admin: admin.email,
        instructor: instructor.email,
        student: student.email
    });
};

seed().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
