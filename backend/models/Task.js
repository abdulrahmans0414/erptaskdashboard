import mongoose from 'mongoose';

// Comment Schema for task activity
const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },
    message: { type: String, required: true },
    attachments: [{
        filename: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number
    }],
    createdAt: { type: Date, default: Date.now }
});

// Activity Log Schema
const activityLogSchema = new mongoose.Schema({
    action: { type: String, enum: ['created', 'started', 'submitted', 'commented', 'approved', 'rejected', 'reassigned', 'status_changed'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    details: { type: String },
    timestamp: { type: Date, default: Date.now }
});

// Define timeLogSchema
const timeLogSchema = new mongoose.Schema({
    action: {
        type: String,
        enum: ['started', 'paused', 'resumed', 'submitted', 'reopened', 'completed', 'approved', 'rejected'],
        required: true
    },
    timestamp: { type: Date, default: Date.now },
    note: String,
    duration: Number
});

const attemptSchema = new mongoose.Schema({
    attemptNumber: { type: Number, required: true },
    startedAt: Date,
    submittedAt: Date,
    timeSpent: Number,
    submissionNote: String,
    submissionAttachments: [{
        filename: String,
        fileUrl: String,
        fileType: String,
        publicId: String,
        fileSize: Number
    }],
    adminFeedback: String,
    adminFeedbackAttachments: [{
        filename: String,
        fileUrl: String,
        fileType: String,
        publicId: String,
        fileSize: Number
    }],
    status: { type: String, enum: ['in-progress', 'submitted', 'rejected', 'approved'], default: 'in-progress' },
    comments: [commentSchema]  // Step-by-step comments
});

const taskSchema = new mongoose.Schema({
    // Basic Info
    title: { type: String, required: true, trim: true },
    description: String,
department: { 
    type: String, 
    required: true 
},
    branch: {
        type: String,
        default: 'Gaurabagh'
    },

    // Task “form” metadata (e.g. PDF/image/doc) for overall tracking
    taskFormName: { type: String, default: '' },
    taskFormType: {
        type: String,
        enum: ['pdf', 'image', 'doc', 'other'],
        default: 'other'
    },
    taskFormAttachments: [{
        filename: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
        publicId: String
    }],
    
    // Assignment
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isTeamTask: { type: Boolean, default: false },
    departmentManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who will review
    branchHead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For escalation
    
    // Cross-department collaboration
    collaboratingDepartments: [{ type: String }],
    collaboratingBranches: [{ type: String }],
    
    // Time Estimates
    estimatedHours: { type: Number, default: 0, min: 0 },
    estimatedMinutes: { type: Number, default: 0, min: 0, max: 59 },
    
    // Time Tracking Fields
    startedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    totalTimeSpent: { type: Number, default: 0 },
    
    // Individual progress tracking for team tasks
    individualProgress: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'in-progress', 'submitted', 'completed'], default: 'pending' },
        startedAt: Date,
        submittedAt: Date,
        timeSpent: { type: Number, default: 0 },
        submissionNote: String,
        comments: [commentSchema]
    }],
    
    // Due Date & Priority
    dueDate: { type: Date, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    
    // Current Status
    status: { type: String, enum: ['pending', 'in-progress', 'submitted', 'approved', 'rejected', 'completed', 'reassigned'], default: 'pending' },
    
    // Attempts Tracking
    attempts: [attemptSchema],
    currentAttempt: { type: Number, default: 0 },
    
    // Comments & Activity
    comments: [commentSchema],
    activityLog: [activityLogSchema],
    
    // Current session tracking
    currentSessionStart: Date,
    currentSessionTotal: { type: Number, default: 0 },

    // Overall workflow tracking:
    // department-head review happens first, then branch-head review.
    workflow: {
        departmentReview: {
            status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
            reviewedAt: { type: Date, default: null },
            reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
            comments: { type: String, default: '' }
        },
        branchReview: {
            status: {
                type: String,
                enum: ['not-started', 'pending', 'approved', 'rejected'],
                default: 'not-started'
            },
            reviewedAt: { type: Date, default: null },
            reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
            comments: { type: String, default: '' }
        }
    },
    
    // Final
    completedAt: Date,
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Time logs & Submission
    timeLogs: [timeLogSchema],
    submissionNote: String,
    adminComments: { type: String, default: '' },
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
}, { timestamps: true });

// ALL METHODS
taskSchema.methods.calculateTotalTime = function() {
    let total = 0;
    for (const attempt of this.attempts) {
        if (attempt.timeSpent) total += attempt.timeSpent;
    }
    this.totalTimeSpent = total;
    return total;
};

taskSchema.methods.startTask = function() {
    if (this.status === 'pending' || this.status === 'rejected' || this.status === 'reassigned') {
        this.status = 'in-progress';
        this.currentAttempt += 1;
        this.startedAt = new Date();
        
        const newAttempt = {
            attemptNumber: this.currentAttempt,
            startedAt: new Date(),
            status: 'in-progress'
        };
        this.attempts.push(newAttempt);
        this.currentSessionStart = new Date();
        
        this.timeLogs.push({
            action: 'started',
            timestamp: new Date(),
            note: `Attempt #${this.currentAttempt} started`
        });
        
        this.activityLog.push({
            action: 'started',
            userId: this.assignedTo,
            details: `Task started by employee`
        });
    }
    return this;
};

taskSchema.methods.addComment = function(userId, userName, userRole, message, attachments = []) {
    const comment = {
        userId,
        userName,
        userRole,
        message,
        attachments,
        createdAt: new Date()
    };
    
    // Add to main comments
    this.comments.push(comment);
    
    // Add to current attempt
    if (this.attempts.length > 0) {
        const currentAttempt = this.attempts[this.attempts.length - 1];
        if (!currentAttempt.comments) currentAttempt.comments = [];
        currentAttempt.comments.push(comment);
    }
    
    this.activityLog.push({
        action: 'commented',
        userId,
        userName,
        details: message.substring(0, 100)
    });
    
    return this;
};

taskSchema.methods.submitTask = function(note, attachments = []) {
    const now = new Date();
    this.submittedAt = now;
    this.submissionNote = note;
    
    const currentAttemptObj = this.attempts[this.attempts.length - 1];
    if (currentAttemptObj) {
        currentAttemptObj.submittedAt = now;
        currentAttemptObj.timeSpent = Math.floor((now - currentAttemptObj.startedAt) / (1000 * 60));
        currentAttemptObj.submissionNote = note;
        currentAttemptObj.submissionAttachments = attachments;
        currentAttemptObj.status = 'submitted';
    }
    
    this.calculateTotalTime();
    this.status = 'submitted';
    
    this.timeLogs.push({
        action: 'submitted',
        timestamp: now,
        note: `Attempt #${this.currentAttempt} submitted. Time: ${currentAttemptObj?.timeSpent || 0} minutes`,
        duration: currentAttemptObj?.timeSpent
    });
    
    this.activityLog.push({
        action: 'submitted',
        userId: this.assignedTo,
        details: `Task submitted for review`
    });
    
    return this;
};

taskSchema.methods.approveTask = function(adminId, comments, attachments = []) {
    this.status = 'approved';
    this.completedAt = new Date();
    this.approvedAt = new Date();
    this.approvedBy = adminId;
    this.adminComments = comments;
    
    if (this.attempts.length > 0) {
        const lastAttempt = this.attempts[this.attempts.length - 1];
        lastAttempt.adminFeedback = comments;
        lastAttempt.adminFeedbackAttachments = attachments;
        lastAttempt.status = 'approved';
    }
    
    this.timeLogs.push({
        action: 'approved',
        timestamp: new Date(),
        note: `Task approved. Total time: ${this.totalTimeSpent} minutes`,
        duration: this.totalTimeSpent
    });
    
    this.activityLog.push({
        action: 'approved',
        userId: adminId,
        details: `Task approved with feedback: ${comments?.substring(0, 100)}`
    });
    
    return this;
};

taskSchema.methods.rejectTask = function(comments, attachments = []) {
    this.status = 'rejected';
    this.adminComments = comments;
    
    if (this.attempts.length > 0) {
        const lastAttempt = this.attempts[this.attempts.length - 1];
        lastAttempt.status = 'rejected';
        lastAttempt.adminFeedback = comments;
        lastAttempt.adminFeedbackAttachments = attachments;
    }
    
    this.timeLogs.push({
        action: 'rejected',
        timestamp: new Date(),
        note: `Task rejected. Reason: ${comments}`
    });
    
    this.activityLog.push({
        action: 'rejected',
        details: `Task rejected with reason: ${comments?.substring(0, 100)}`
    });
    
    return this;
};

taskSchema.methods.reassignTask = function(newAssigneeId, reason, attachments = []) {
    const oldAssignee = this.assignedTo;
    this.assignedTo = newAssigneeId;
    this.status = 'pending';
    this.adminComments = reason;
    
    this.activityLog.push({
        action: 'reassigned',
        details: `Task reassigned from ${oldAssignee} to ${newAssigneeId}. Reason: ${reason}`
    });
    
    return this;
};


// Indexes for optimized query performance
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ assignedTeam: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedTeam: 1, status: 1 });
taskSchema.index({ department: 1, branch: 1, status: 1 });
taskSchema.index({ department: 1, branch: 1, createdAt: -1 }); // Added for dashboard time-filtering
taskSchema.index({ branch: 1, status: 1 });
taskSchema.index({ branch: 1, createdAt: -1 }); // Added for branch-level time-filtering
taskSchema.index({ createdAt: -1 });
taskSchema.index({ createdAt: -1, _id: -1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ title: 'text', description: 'text' });

export default mongoose.model('Task', taskSchema);