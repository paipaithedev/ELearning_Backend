const { z } = require('zod');

exports.upsertProgressBody = z.object({
    lessonId: z.string().min(1),
    watchTime: z.number().min(0).optional(),
    lastPosition: z.number().min(0).optional(),
    isCompleted: z.boolean().optional()
});
