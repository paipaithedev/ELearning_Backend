const { z } = require('zod');

const stringArray = z.array(z.string()).optional();

exports.createCourseBody = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    thumbnail: z.string().optional(),
    previewVideo: z.string().optional(),
    price: z.number().min(0).optional(),
    discountPrice: z.number().min(0).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    language: z.string().optional(),
    categoryId: z.string().optional(),
    tags: stringArray,
    requirements: stringArray,
    outcomes: stringArray,
    totalDuration: z.number().min(0).optional(),
    lessonsCount: z.number().min(0).optional(),
    isPublished: z.boolean().optional()
});

exports.updateCourseBody = exports.createCourseBody.partial();
