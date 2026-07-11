const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true // e.g., 'CREATE', 'UPDATE', 'DELETE'
    },
    module: {
        type: String,
        required: true // e.g., 'COURSE', 'USER', 'PAYMENT'
    },
    details: {
        type: String,
        default: ''
    },
    resourceId: {
        type: String,
        default: ''
    },
    ipAddress: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    },
    dismissedBy: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
