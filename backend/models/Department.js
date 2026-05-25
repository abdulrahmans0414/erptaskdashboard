import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    head: String,
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    managerEmail: String,
    icon: String,
    color: String,
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date
    }
}, {
    timestamps: true
});

departmentSchema.pre('save', async function(next) {
    if (this.isModified('manager') && this.manager) {
        const User = mongoose.model('User');
        const user = await User.findById(this.manager);
        if (user && !['admin', 'department-head'].includes(user.role)) {
            throw new Error(`RBAC Error: User ${user.name} holds role '${user.role}' and cannot be assigned as a Department Manager.`);
        }
    }
    next();
});

departmentSchema.pre('findOneAndUpdate', async function(next) {
    const update = this.getUpdate();
    if (update.manager || (update.$set && update.$set.manager)) {
        const managerId = update.manager || update.$set.manager;
        const User = mongoose.model('User');
        const user = await User.findById(managerId);
        if (user && !['admin', 'department-head'].includes(user.role)) {
            throw new Error(`RBAC Error: User ${user.name} holds role '${user.role}' and cannot be assigned as a Department Manager.`);
        }
    }
    next();
});

departmentSchema.post('findOneAndUpdate', async function(doc, next) {
    // Cascade Updates
    if (doc) {
        const update = this.getUpdate();
        if (update.name || (update.$set && update.$set.name)) {
            const newName = update.name || update.$set.name;
            const User = mongoose.model('User');
            const Task = mongoose.model('Task');
            
            const query = this.getQuery();
            if (query.name && query.name !== newName) {
                await User.updateMany({ department: query.name }, { $set: { department: newName } });
                await Task.updateMany({ department: query.name }, { $set: { department: newName } });
            }
        }
    }
    next();
});

export default mongoose.model('Department', departmentSchema);