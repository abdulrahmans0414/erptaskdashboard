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
    action: {
        type: String,
        required: true
    },
    details: String,
    oldStatus: String,
    newStatus: String,
    ipAddress: String,
    userAgent: String
}, {
    timestamps: true
});

export default mongoose.model('ActivityLog', activityLogSchema);