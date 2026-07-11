const { z } = require('zod');

exports.createReviewBody = z.object({
    courseId: z.string().min(1),
    rating: z.number().min(1).max(5),
    comment: z.string().optional()
});
