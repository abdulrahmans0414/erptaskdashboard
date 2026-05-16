import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
    recipient: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    subject: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['OTP', 'WELCOME', 'TASK_ASSIGNED', 'TASK_SUBMITTED', 'TASK_APPROVED', 'TASK_REJECTED', 'TASK_UPDATED'],
        required: true
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    contentSnippet: {
        type: String,
        default: ''
    },
    attachments: [{
        filename: String,
        fileUrl: String,
        fileSize: Number
    }],
    status: {
        type: String,
        enum: ['sent', 'failed'],
        default: 'sent'
    },
    error: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Index for searching history
emailLogSchema.index({ recipient: 1, createdAt: -1 });
emailLogSchema.index({ taskId: 1 });
emailLogSchema.index({ type: 1 });

export default mongoose.model('EmailLog', emailLogSchema);
