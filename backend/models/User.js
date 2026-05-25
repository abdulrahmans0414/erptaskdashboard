import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
        type: String,
        enum: ['admin', 'hr', 'it', 'graphic', 'employee', 'department-head', 'branch-head'],
        default: 'employee'
    },
    department: {
        type: String,
        required: [true, 'Department is required']
    },
    branch: {
        type: String,
        default: 'Gaurabagh'
    },
    avatar: {
        type: String,
        default: null
    },
    avatarPublicId: {         // Cloudinary public_id for deletion
        type: String,
        default: null
    },
    phone: {
        type: String,
        default: null
    },
    dateOfJoining: {
        type: Date,
        default: Date.now
    },

    designation: {
        type: String,
        default: ''
    },
    privilegeRequestReason: {
        type: String,
        default: ''
    },
    adminComments: {
        type: String,
        default: ''
    },
    customFields: {
        type: Map,
        of: String,
        default: {}
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date
    },
    lastLogin: Date,
    employeeId: { type: String, unique: true, sparse: true }
}, {
    timestamps: true
});



// Hash password before saving (only when modified)
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    // Bypass hashing if password already starts with bcrypt hash prefixes to prevent double-hashing
    if (this.password && (this.password.startsWith('$2a$') || this.password.startsWith('$2b$'))) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
    try {
        if (this.password && (this.password.startsWith('$2a$') || this.password.startsWith('$2b$'))) {
            return await bcrypt.compare(password, this.password);
        }
        return password === this.password;
    } catch (error) {
        console.error('Password comparison error:', error);
        return password === this.password;
    }
};

// Index for common queries
userSchema.index({ department: 1, branch: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Prevent high-privilege role duplicates (partial unique indexes)
// - At most one Branch Head per branch
// - At most one Department Head per (department, branch)
userSchema.index(
    { role: 1, branch: 1 },
    { unique: true, partialFilterExpression: { role: 'branch-head', isDeleted: false } }
);
userSchema.index(
    { role: 1, department: 1, branch: 1 },
    { unique: true, partialFilterExpression: { role: 'department-head', isDeleted: false } }
);

userSchema.index({ name: 'text', email: 'text', employeeId: 'text' });

// Phase 2 Query Optimization
userSchema.index({ isDeleted: 1, department: 1, branch: 1, role: 1 });

export default mongoose.model('User', userSchema);
