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
employeeSchema.pre('save', async function(next) {
    try {
        if (this.branch && this.branch !== 'Central Gaurabagh') {
            const Branch = mongoose.model('Branch');
            const branchObj = await Branch.findOne({ name: this.branch }).lean();
            if (branchObj && branchObj.departments && branchObj.departments.length > 0) {
                if (!branchObj.departments.includes(this.department)) {
                    this.department = branchObj.departments.includes('Admin') ? 'Admin' : branchObj.departments[0];
                }
            } else {
                if (this.department && this.department !== 'Academic') {
                    this.department = 'Admin';
                }
            }
        }
        next();
    } catch (err) {
        next(err);
    }
});

export default mongoose.model('Employee', employeeSchema);