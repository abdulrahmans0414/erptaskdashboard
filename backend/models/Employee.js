import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String
    },
    department: {
        type: String,
        required: true
    },
    branch: {
        type: String,
        required: true
    },
    designation: {
        type: String
    },
    joiningDate: {
        type: Date,
        required: true
    },
    resignationDate: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    salary: {
        basic: { type: Number, default: 0 },
        netSalary: { type: Number, default: 0 }
    },
    leaveBalance: {
        casualLeave: { type: Number, default: 12 },
        earnedLeave: { type: Number, default: 15 },
        sickLeave: { type: Number, default: 10 },
        paidLeave: { type: Number, default: 5 }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Scoped department logic
employeeSchema.pre('save', function(next) {
    if (this.branch && this.branch !== 'Central Gaurabagh') {
        if (this.department && this.department !== 'Academic') {
            this.department = 'Admin';
        }
    }
    next();
});

export default mongoose.model('Employee', employeeSchema);