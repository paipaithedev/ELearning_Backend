const { z } = require('zod');

const formatZodErrors = (error) => {
    return error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
    }));
};

module.exports = (schemas) => (req, res, next) => {
    try {
        if (schemas.body) {
            req.body = schemas.body.parse(req.body);
        }
        if (schemas.params) {
            req.params = schemas.params.parse(req.params);
        }
        if (schemas.query) {
            req.query = schemas.query.parse(req.query);
        }
        return next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation error.',
                errors: formatZodErrors(error)
            });
        }
        return next(error);
    }
};
