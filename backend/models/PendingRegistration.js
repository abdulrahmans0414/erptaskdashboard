import mongoose from 'mongoose';

const pendingRegistrationSchema = new mongoose.Schema({
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true },
    phone:      { type: String, default: '' },
    designation:{ type: String, default: '' },
    employeeId: { type: String, default: '' },
    role: {
        type: String,
        enum: ['hr','it','graphic','employee','department-head','coordinator','mentor','teacher','student','branch-head'],
        default: 'employee'
    },
    // For high-privilege role requests (branch-head/department-head), user must provide a reason.
    privilegeRequestReason: { type: String, default: '' },
    department: {
        type: String,
        required: true
    },
    branch: {
        type: String,
        default: 'Gaurabagh'
    },
    otp:          { type: String, default: null },
    otpExpiresAt: { type: Date,   default: null },
    otpVerified:  { type: Boolean,default: false },
    status:       { type: String, enum: ['pending','otp_sent','approved','rejected'], default: 'pending' },
    adminNote:    { type: String, default: '' },
    reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt:   Date
}, { timestamps: true });

export default mongoose.model('PendingRegistration', pendingRegistrationSchema);
