const { z } = require('zod');

exports.enrollBody = z.object({
    courseId: z.string().min(1)
});
