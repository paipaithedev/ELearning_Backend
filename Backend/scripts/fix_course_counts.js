const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Models
const Course = require('../schema/Course');
const Chapter = require('../schema/Chapter');
const Lesson = require('../schema/Lesson');

// Load environment variables from .env file in parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixCounts() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env file');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const courses = await Course.find();
        console.log(`Found ${courses.length} courses to process.`);

        for (const course of courses) {
            console.log(`Processing: ${course.title} (${course._id})`);
            
            // Count lessons for this course 
            // In this specific system, lessons are linked to courses via courseId
            const lessons = await Lesson.find({ courseId: course._id });
            const lessonsCount = lessons.length;
            const totalDuration = lessons.reduce((acc, l) => acc + (l.duration || 0), 0);

            console.log(`  -> Actual lessons: ${lessonsCount}, Total duration: ${totalDuration}`);

            await Course.findByIdAndUpdate(course._id, {
                lessonsCount: lessonsCount,
                totalDuration: totalDuration
            });
            console.log(`  -> Updated.`);
        }

        console.log('All courses synchronized successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Repair failed:', error);
        process.exit(1);
    }
}

fixCounts();
