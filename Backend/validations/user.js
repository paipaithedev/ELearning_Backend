const { z } = require('zod');

exports.adminCreateUserBody = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['student', 'instructor', 'admin']).default('student'),
    status: z.enum(['active', 'pending', 'inactive', 'suspended', 'banned']).default('active')
});

exports.editUserBody = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    isVerified: z.boolean().optional()
});

exports.updateUserRoleBody = z.object({
    role: z.enum(['student', 'instructor', 'admin'])
});

exports.updateUserStatusBody = z.object({
    status: z.enum(['active', 'pending', 'inactive', 'suspended', 'banned'])
});
