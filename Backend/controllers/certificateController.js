const Certificate = require('../schema/Certificate');
const Enrollment = require('../schema/Enrollment');
const Lesson = require('../schema/Lesson');
const Progress = require('../schema/Progress');

exports.issueCertificate = async (req, res) => {
    try {
        const { courseId } = req.body;
        if (!courseId) {
            return res.status(400).json({ success: false, message: 'courseId is required.' });
        }

        const enrolled = await Enrollment.findOne({ userId: req.user._id, courseId });
        if (!enrolled) {
            return res.status(403).json({ success: false, message: 'Enrollment required.' });
        }

        // Check if course is 100% completed
        const [totalLessons, completedLessons] = await Promise.all([
            Lesson.countDocuments({ courseId }),
            Progress.countDocuments({ userId: req.user._id, courseId, isCompleted: true })
        ]);

        if (totalLessons === 0 || completedLessons < totalLessons) {
            return res.status(400).json({ 
                success: false, 
                message: 'Course not completed yet.',
                data: {
                    totalLessons,
                    completedLessons,
                    percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
                }
            });
        }

        const certificate = await Certificate.findOneAndUpdate(
            { userId: req.user._id, courseId },
            { $setOnInsert: { userId: req.user._id, courseId } },
            { new: true, upsert: true }
        );

        return res.status(201).json({
            success: true,
            message: 'Certificate issued.',
            data: { certificate }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to issue certificate.',
            error: error.message
        });
    }
};

exports.myCertificates = async (req, res) => {
    try {
        const certificates = await Certificate.find({ userId: req.user._id })
            .populate('courseId', 'title thumbnail')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Certificates fetched.',
            data: { certificates, count: certificates.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch certificates.',
            error: error.message
        });
    }
};

exports.listAllCertificates = async (req, res) => {
    try {
        const certificates = await Certificate.find()
            .populate('userId', 'name avatar email')
            .populate('courseId', 'title')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'All certificates fetched.',
            data: { certificates, count: certificates.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch certificates.',
            error: error.message
        });
    }
};

exports.deleteCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        await Certificate.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: 'Certificate deleted.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete certificate.',
            error: error.message
        });
    }
};

exports.downloadCertificate = async (req, res) => {
    try {
        const id = req.params.id || req.params.certificateId;
        const certificate = await Certificate.findById(id)
            .populate('userId', 'name')
            .populate('courseId', 'title');

        if (!certificate) {
            return res.status(404).json({ success: false, message: 'Certificate not found.' });
        }

        // In a real app, you would generate a PDF here using a library like PDFKit or puppeteer.
        // For now, we'll return a JSON response that the frontend can use to trigger its fallback 
        // canvas-based generation if needed, or if we had a PDF file, we would res.download() it.
        
        // Since the frontend has a fallback, we can return a 404 with a specific message 
        // if we want to trigger the fallback, OR we can return the certificate data.
        
        // Let's return the certificate data so the frontend knows it found the route.
        return res.status(200).json({
            success: true,
            message: 'Certificate data for download.',
            data: {
                certificate,
                learnerName: certificate.userId.name,
                courseTitle: certificate.courseId.title,
                issuedAt: certificate.createdAt
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to process download request.',
            error: error.message
        });
    }
};
