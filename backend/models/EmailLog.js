import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
    recipient: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    sender: {
        type: String,
        default: '',
        trim: true
    },
    subject: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['OTP', 'WELCOME', 'TASK_ASSIGNED', 'TASK_SUBMITTED', 'TASK_APPROVED', 'TASK_REJECTED', 'TASK_UPDATED', 'INBOX', 'TASKS', 'SECURITY'],
        required: true
    },
    source: {
        type: String,
        enum: ['system', 'gmail_sync'],
        default: 'system'
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
    body: {
        type: String,
        default: ''
    },
    attachments: [{
        filename: String,
        fileUrl: String,
        fileSize: Number,
        contentType: String
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

// Indexes for fast querying
emailLogSchema.index({ recipient: 1, createdAt: -1 });
emailLogSchema.index({ taskId: 1 });
emailLogSchema.index({ type: 1 });
emailLogSchema.index({ status: 1 });
emailLogSchema.index({ createdAt: -1 });

export default mongoose.model('EmailLog', emailLogSchema);
