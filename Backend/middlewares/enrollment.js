const Enrollment = require('../schema/Enrollment');

module.exports = async (req, res, next) => {
    try {
        const courseId = req.params.courseId || req.body.courseId;

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized.' });
        }

        if (!courseId) {
            return res.status(400).json({ success: false, message: 'courseId is required.' });
        }

        const enrollment = await Enrollment.findOne({
            userId: req.user._id,
            courseId
        });

        if (!enrollment) {
            return res.status(403).json({ success: false, message: 'Enrollment required.' });
        }

        req.enrollment = enrollment;
        return next();
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Enrollment check failed.' });
    }
};
