const { z } = require('zod');

exports.issueCertificateBody = z.object({
    courseId: z.string().min(1)
});
