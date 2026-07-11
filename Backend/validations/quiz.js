const { z } = require('zod');

exports.createQuizBody = z.object({
    courseId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    timeLimit: z.number().min(0).optional(),
    passScore: z.number().min(0).max(100).optional(),
    settings: z.object({
        randomizeQuestions: z.boolean().optional(),
        randomizeOptions: z.boolean().optional(),
        showFeedback: z.boolean().optional(),
        maxAttempts: z.number().min(0).optional()
    }).optional()
});

exports.updateQuizBody = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    timeLimit: z.number().min(0).optional(),
    passScore: z.number().min(0).max(100).optional(),
    settings: z.object({
        randomizeQuestions: z.boolean().optional(),
        randomizeOptions: z.boolean().optional(),
        showFeedback: z.boolean().optional(),
        maxAttempts: z.number().min(0).optional()
    }).optional()
});

exports.addQuestionBody = z.object({
    quizId: z.string().min(1),
    prompt: z.string().min(1),
    type: z.enum(['mcq', 'multi_select', 'true_false', 'short_answer']).optional(),
    options: z.array(z.object({ 
        text: z.string().min(1),
        isCorrect: z.boolean().optional()
    })).min(1),
    correctIndex: z.number().min(0).optional(),
    points: z.number().min(0).optional(),
    explanation: z.string().optional()
});

exports.updateQuestionBody = z.object({
    prompt: z.string().min(1).optional(),
    type: z.enum(['mcq', 'multi_select', 'true_false', 'short_answer']).optional(),
    options: z.array(z.object({ 
        text: z.string().min(1),
        isCorrect: z.boolean().optional()
    })).min(1).optional(),
    correctIndex: z.number().min(0).optional(),
    points: z.number().min(0).optional(),
    explanation: z.string().optional()
});

exports.submitQuizBody = z.object({
    quizId: z.string().min(1),
    answers: z.array(z.any())
});
