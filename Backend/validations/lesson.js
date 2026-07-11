const { z } = require('zod');

exports.createLessonBody = z.object({
    courseId: z.string().min(1),
    chapterId: z.string().min(1),
    title: z.string().min(1),
    content: z.string().optional(),
    videoUrl: z.string().optional(),
    lessonType: z.enum(['video', 'text', 'quiz', 'file']).optional(),
    duration: z.number().min(0).optional(),
    order: z.number().min(0).optional(),
    isPreview: z.boolean().optional()
});

exports.updateLessonBody = z.object({
    title: z.string().min(1).optional(),
    content: z.string().optional(),
    videoUrl: z.string().optional(),
    lessonType: z.enum(['video', 'text', 'quiz', 'file']).optional(),
    duration: z.number().min(0).optional(),
    order: z.number().min(0).optional(),
    isPreview: z.boolean().optional()
});
