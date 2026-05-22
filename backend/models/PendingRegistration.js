import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const pendingRegistrationSchema = new mongoose.Schema({
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true },
    phone:      { type: String, default: '' },
    designation:{ type: String, default: '' },
    employeeId: { type: String, default: '' },
    role: {
        type: String,
        enum: ['hr','it','graphic','employee','department-head','branch-head'],
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

// Pre-save hook to hash password with 12 salt rounds for GDPR privacy compliance
pendingRegistrationSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

export default mongoose.model('PendingRegistration', pendingRegistrationSchema);
