import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: [
            'task_assigned',
            'task_started',
            'task_submitted',
            'task_approved',
            'task_rejected',
            'task_branch_review_pending',  // ← ADD THIS
            'task_completed',              // ← Optional, but good to have
            'task_reassigned',             // ← Optional
            'team_task_completed',         // ← Optional, for team tasks
            'registration_request',
            'otp_sent',
            'account_approved',
            'account_rejected'
        ],
        required: true
    },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);