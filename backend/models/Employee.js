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
        enum: ['IT', 'HR', 'Graphic', 'Academic', 'Finance', 'Marketing', 'Legal', 'Transport', 'Operations'],
        required: true
    },
    branch: {
        type: String,
        enum: ['Gaurabagh', 'Vikas Nagar', 'Kalyanpur', 'Kursi', 'Hive', 'Ring Road', 'Muazzam Nagar', 'Aziz Nagar'],
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

export default mongoose.model('Employee', employeeSchema);