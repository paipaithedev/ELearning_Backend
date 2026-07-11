const { z } = require('zod');

exports.createCategoryBody = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    icon: z.string().optional(),
    parentId: z.string().optional(),
    isActive: z.boolean().optional()
});

exports.updateCategoryBody = exports.createCategoryBody.partial();
