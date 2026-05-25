import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        index: true
    },
    entityType: {
        type: String, // e.g., 'USER', 'SETTINGS', 'BRANCH', 'TASK'
        required: true,
        index: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    oldData: {
        type: mongoose.Schema.Types.Mixed
    },
    newData: {
        type: mongoose.Schema.Types.Mixed
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        // Native MongoDB TTL index: Document will automatically be deleted 90 days after creation
        expires: '90d' 
    }
});

// Create compound index for fast querying
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
