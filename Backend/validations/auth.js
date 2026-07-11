const { z } = require('zod');

exports.registerBody = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6)
});

exports.loginBody = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});

exports.forgotPasswordBody = z.object({
    email: z.string().email()
});

exports.resetPasswordBody = z.object({
    token: z.string().min(10),
    newPassword: z.string().min(6)
});

exports.updateMeBody = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    bio: z.string().optional(),
    avatar: z.string().optional().or(z.literal(''))
});
