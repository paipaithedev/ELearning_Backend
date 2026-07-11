const AuditLog = require('../schema/AuditLog');

const auditLogger = async (req, res, next) => {
    // Only log state-changing requests from admins
    if (req.user && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
        res.on('finish', async () => {
            // Only log successful operations
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    // Extract module from URL e.g., /api/courses -> COURSES
                    const urlParts = req.originalUrl.split('/');
                    const module = urlParts[2] ? urlParts[2].toUpperCase() : 'SYSTEM';
                    
                    const actionMap = { 'POST': 'CREATE', 'PATCH': 'UPDATE', 'PUT': 'UPDATE', 'DELETE': 'DELETE' };
                    
                    // Don't log sensitive info like passwords
                    const safeBody = { ...req.body };
                    delete safeBody.password;
                    delete safeBody.confirmPassword;

                    await AuditLog.create({
                        userId: req.user._id,
                        action: actionMap[req.method],
                        module: module,
                        details: Object.keys(safeBody).length > 0 ? JSON.stringify(safeBody) : 'No body details',
                        resourceId: req.params.id || '',
                        ipAddress: req.ip || req.connection.remoteAddress,
                        userAgent: req.get('User-Agent')
                    });
                } catch (err) {
                    console.error('Audit Logging Error:', err);
                }
            }
        });
    }
    next();
};

module.exports = auditLogger;
