import mongoose from 'mongoose';

const customFieldSchema = new mongoose.Schema({
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'date', 'boolean', 'select'], default: 'text' },
    options: [{ type: String }], // For select type
    required: { type: Boolean, default: false }
});

const settingsSchema = new mongoose.Schema({
    // Only one settings document should exist
    singleton: { type: String, default: 'SYSTEM_SETTINGS', unique: true },

    departments: {
        type: [String],
        default: ['IT', 'HR', 'Graphic', 'Academic', 'Finance', 'Marketing', 'Legal', 'Transport', 'Operations']
    },

    branches: {
        type: [String],
        default: ['Gaurabagh', 'Vikas Nagar', 'Kalyanpur', 'Kursi', 'Hive', 'Ring Road', 'Muazzam Nagar', 'Aziz Nagar']
    },

    userCustomFields: [customFieldSchema],

    emailConfig: {
        host: { type: String, default: '' },
        port: { type: Number, default: 587 },
        user: { type: String, default: '' },
        pass: { type: String, default: '' },
        fromEmail: { type: String, default: '' }
    },

    // Department CC emails: { "HR": "hr@spis.in", "IT": "it@spis.in" }
    // When any task in a department is submitted, this email gets CC'd
    departmentEmails: {
        type: Map,
        of: String,
        default: {}
    },

    // Branch CC emails: { "Gaurabagh": "gaurabagh@spis.in" }
    // When any task in a branch is submitted, this email gets CC'd
    branchEmails: {
        type: Map,
        of: String,
        default: {}
    }
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
