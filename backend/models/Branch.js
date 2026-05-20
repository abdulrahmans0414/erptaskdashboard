import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    departments: [{ type: String }],

    code: {
        type: String,
        required: true,
        unique: true
    },
    location: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    phone: String,
    email: String,
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    headName: { type: String },  // Branch Head Name
    headEmail: { type: String },  // Branch Head Email
    isActive: { type: Boolean, default: true },
    settings: {
        timezone: { type: String, default: 'Asia/Kolkata' },
        workingHours: {
            start: { type: String, default: '09:00' },
            end: { type: String, default: '18:00' }
        }
    }
}, { timestamps: true });

branchSchema.pre('save', function(next) {
    if (this.name === 'Central Gaurabagh') {
        this.departments = ['IT', 'HR', 'Graphic', 'Academic', 'Finance', 'Marketing', 'Legal', 'Transport', 'Operations', 'Admin'];
    } else {
        this.departments = ['Admin', 'Academic'];
    }
    next();
});

export default mongoose.model('Branch', branchSchema);