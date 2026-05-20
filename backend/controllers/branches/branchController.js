import Branch from '../../models/Branch.js';
import User from '../../models/User.js';
import Task from '../../models/Task.js';
import PendingRegistration from '../../models/PendingRegistration.js';
import Settings from '../../models/Settings.js';
import Employee from '../../models/Employee.js';
import Notification from '../../models/Notification.js';
import ActivityLog from '../../models/ActivityLog.js';

// Keep Branch.headName/headEmail in sync with User(role='branch-head') for that branch.
// This makes frontend Branch Management behave like seed.js se initial setup.
const syncBranchHeadUser = async (branch) => {
    const branchName = branch?.name;
    if (!branchName) return;

    // If Branch has no head identity, don't create new user automatically.
    // (We still can update name if a user already exists.)
    const headName = branch?.headName || '';
    const headEmail = branch?.headEmail || '';

    const existingList = await User.find({ role: 'branch-head', branch: branchName }).sort({ createdAt: 1 });
    const existing = existingList[0] || null;

    // If duplicates already exist, keep the oldest and delete the rest (safe cleanup).
    if (existingList.length > 1) {
        const dupes = existingList.slice(1).map(u => u._id);
        await User.deleteMany({ _id: { $in: dupes } });
    }

    if (!existing) {
        if (!headEmail) return; // can't create login account without email

        // If email is already used by some other account, do not auto-create.
        const emailTaken = await User.findOne({ email: headEmail.toLowerCase().trim() }).select('_id role branch');
        if (emailTaken) return;

        await User.create({
            name: headName || headEmail.split('@')[0],
            email: headEmail,
            password: 'branch123', // default; user can change later in their flow
            role: 'branch-head',
            department: 'Operations',
            branch: branchName,
            isActive: true
        });
        return;
    }

    // Update existing branch-head user
    if (headName) existing.name = headName;
    if (headEmail) {
        const normalized = headEmail.toLowerCase().trim();
        if (normalized !== existing.email) {
            const emailTaken = await User.findOne({ email: normalized, _id: { $ne: existing._id } }).select('_id');
            if (!emailTaken) existing.email = normalized;
        }
    }
    existing.department = 'Operations';
    existing.isActive = true;
    await existing.save();
};

export const getAllBranches = async (req, res) => {
    try {
        const branches = await Branch.find().populate('manager', 'name email');
        res.json({ success: true, data: branches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getBranchById = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id).populate('manager', 'name email');
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }
        res.json({ success: true, data: branch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createBranch = async (req, res) => {
    try {
        const branch = await Branch.create(req.body);
        await syncBranchHeadUser(branch);
        
        // Auto sync to Settings branches array
        const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
        if (settings && !settings.branches.includes(branch.name)) {
            settings.branches.push(branch.name);
            settings.markModified('branches');
            await settings.save();
        }

        const updated = await Branch.findById(branch._id);
        res.status(201).json({ success: true, data: updated });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateBranch = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }

        const oldName = branch.name;
        const newName = req.body.name;

        // If branch name is changing, check for duplicates and then cascade update references
        if (newName && newName !== oldName) {
            const dup = await Branch.findOne({ name: newName, _id: { $ne: req.params.id } });
            if (dup) {
                return res.status(400).json({ success: false, message: 'A branch with this name already exists' });
            }

            // Cascade update branch reference across collections
            await User.updateMany({ branch: oldName }, { branch: newName });
            await Task.updateMany({ branch: oldName }, { branch: newName });
            await Task.updateMany(
                { collaboratingBranches: oldName },
                { $set: { "collaboratingBranches.$[elem]": newName } },
                { arrayFilters: [{ "elem": oldName }] }
            );
            await PendingRegistration.updateMany({ branch: oldName }, { branch: newName });
            await Employee.updateMany({ branch: oldName }, { branch: newName });

            // Sync with Settings singleton branches and branchEmails map
            const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
            if (settings) {
                const idx = settings.branches.indexOf(oldName);
                if (idx !== -1) {
                    settings.branches[idx] = newName;
                    settings.markModified('branches');
                }
                if (settings.branchEmails && settings.branchEmails.has(oldName)) {
                    const email = settings.branchEmails.get(oldName);
                    settings.branchEmails.set(newName, email);
                    settings.branchEmails.delete(oldName);
                    settings.markModified('branchEmails');
                }
                await settings.save();
            }
        }

        // Update allowed fields (Branch model will validate enums/required)
        Object.assign(branch, req.body);
        const updated = await branch.save();

        await syncBranchHeadUser(updated);

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteBranch = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }

        const oldName = branch.name;

        // Find all users in the branch to delete their notifications/activity logs
        const users = await User.find({ branch: oldName }).select('_id');
        const userIds = users.map(u => u._id);

        // Find all tasks in the branch to delete their activity logs/notifications
        const tasks = await Task.find({ branch: oldName }).select('_id');
        const taskIds = tasks.map(t => t._id);

        // Delete notifications & activity logs for all branch users and tasks
        await Notification.deleteMany({ $or: [{ userId: { $in: userIds } }, { taskId: { $in: taskIds } }] });
        await ActivityLog.deleteMany({ $or: [{ userId: { $in: userIds } }, { taskId: { $in: taskIds } }] });

        // Delete users, tasks, pending registrations, and employee files in this branch
        await User.deleteMany({ branch: oldName });
        await Task.deleteMany({ branch: oldName });
        await PendingRegistration.deleteMany({ branch: oldName });
        await Employee.deleteMany({ branch: oldName });

        // Pull branch from Settings list & emails map
        const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
        if (settings) {
            settings.branches = settings.branches.filter(b => b !== oldName);
            if (settings.branchEmails) {
                settings.branchEmails.delete(oldName);
            }
            settings.markModified('branches');
            settings.markModified('branchEmails');
            await settings.save();
        }

        // Finally, delete the branch document itself
        await branch.deleteOne();

        res.json({ success: true, message: 'Branch and all its associated users, tasks, and settings deleted successfully (Full Tree Deletion)' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getBranchStats = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }
        
        const users = await User.find({ branch: branch.name });
        const tasks = await Task.find({ branch: branch.name });
        
        const stats = {
            branchName: branch.name,
            totalEmployees: users.length,
            totalTasks: tasks.length,
            completedTasks: tasks.filter(t => t.status === 'completed' || t.status === 'approved').length,
            pendingTasks: tasks.filter(t => t.status === 'pending').length,
            inProgressTasks: tasks.filter(t => t.status === 'in-progress').length
        };
        
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};