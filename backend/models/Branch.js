import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: [
            'Gaurabagh',
            'Vikas Nagar',
            'Kalyanpur',
            'Kursi',
            'Hive',
            'Ring Road',
            'Muazzam Nagar',
            'Aziz Nagar'
        ]
    },
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

export default mongoose.model('Branch', branchSchema);