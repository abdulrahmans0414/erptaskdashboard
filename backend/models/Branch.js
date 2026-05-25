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
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    headName: { type: String },  // Branch Head Name
    headEmail: { type: String },  // Branch Head Email
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    settings: {
        timezone: { type: String, default: 'Asia/Kolkata' },
        workingHours: {
            start: { type: String, default: '09:00' },
            end: { type: String, default: '18:00' }
        }
    }
}, { timestamps: true });

branchSchema.pre('save', async function(next) {
    if (this.isNew && (!this.departments || this.departments.length === 0)) {
        if (this.name === 'Central Gaurabagh') {
            this.departments = ['IT', 'HR', 'Graphic', 'Academic', 'Finance', 'Marketing', 'Legal', 'Transport', 'Operations', 'Admin'];
        } else {
            this.departments = ['Admin', 'Academic'];
        }
    }
    
    // RBAC Collision Protection: Validate manager role
    if (this.isModified('manager') && this.manager) {
        const User = mongoose.model('User');
        const user = await User.findById(this.manager);
        if (user && !['admin', 'branch-head'].includes(user.role)) {
            throw new Error(`RBAC Error: User ${user.name} holds role '${user.role}' and cannot be assigned as a Branch Manager.`);
        }
    }
    
    next();
});

branchSchema.pre('findOneAndUpdate', async function(next) {
    const update = this.getUpdate();
    if (update.manager || (update.$set && update.$set.manager)) {
        const managerId = update.manager || update.$set.manager;
        const User = mongoose.model('User');
        const user = await User.findById(managerId);
        if (user && !['admin', 'branch-head'].includes(user.role)) {
            throw new Error(`RBAC Error: User ${user.name} holds role '${user.role}' and cannot be assigned as a Branch Manager.`);
        }
    }
    next();
});

branchSchema.post('findOneAndUpdate', async function(doc, next) {
    // Cascade Updates
    if (doc) {
        const update = this.getUpdate();
        if (update.name || (update.$set && update.$set.name)) {
            const newName = update.name || update.$set.name;
            const User = mongoose.model('User');
            const Task = mongoose.model('Task');
            
            // Note: We use doc.name because `doc` is the returned document. Wait, findOneAndUpdate returns the NEW doc if `new: true`, or OLD doc if `new: false` (default).
            // To be perfectly safe, we update where branch equals the OLD name (which we can't easily get here if new: true).
            // Actually, a better approach is to use the query filter.
            const query = this.getQuery();
            if (query.name && query.name !== newName) {
                await User.updateMany({ branch: query.name }, { $set: { branch: newName } });
                await Task.updateMany({ branch: query.name }, { $set: { branch: newName } });
            }
        }
    }
    next();
});

branchSchema.index({ name: 1 }, { collation: { locale: 'en', strength: 2 } });
branchSchema.index({ code: 1 }, { collation: { locale: 'en', strength: 2 } });
branchSchema.index({ city: 1 }, { collation: { locale: 'en', strength: 2 } });
branchSchema.index({ location: 1 }, { collation: { locale: 'en', strength: 2 } });

export default mongoose.model('Branch', branchSchema);