const { z } = require('zod');

exports.createPaymentBody = z.object({
    courseId: z.string().min(1),
    amount: z.number().min(0),
    currency: z.string().optional(),
    paymentMethod: z.string().optional(),
    provider: z.string().optional(),
    transactionId: z.string().optional(),
    status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional()
});

exports.verifyPaymentBody = z.object({
    status: z.enum(['paid', 'failed']),
    adminNote: z.string().optional()
});
