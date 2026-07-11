const { z } = require('zod');

exports.createChapterBody = z.object({
    courseId: z.string().min(1),
    title: z.string().min(1),
    order: z.number().min(0).optional()
});

exports.updateChapterBody = z.object({
    title: z.string().min(1).optional(),
    order: z.number().min(0).optional()
});
