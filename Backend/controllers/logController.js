const AuditLog = require('../schema/AuditLog');

exports.listLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find()
            .populate('userId', 'name email role')
            .sort({ createdAt: -1 })
            .limit(500); // Limit to 500 for performance

        return res.status(200).json({
            success: true,
            message: 'Audit logs fetched.',
            data: { logs, count: logs.length }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs.',
            error: error.message
        });
    }
};
