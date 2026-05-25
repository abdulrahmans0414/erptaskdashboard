import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    userName: String,
    userRole: String,
    action: {
        type: String,
        required: true
    },
    entityType: {
        type: String, // e.g. 'TASK', 'USER', 'SETTINGS', 'BRANCH'
    },
    details: String,
    oldStatus: String,
    newStatus: String,
    oldData: mongoose.Schema.Types.Mixed,
    newData: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '90d' // Native MongoDB TTL index: 90 days retention
    }
}, {
    timestamps: true
});

export default mongoose.model('ActivityLog', activityLogSchema);