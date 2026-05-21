import Branch from '../../models/Branch.js';
import User from '../../models/User.js';
import Task from '../../models/Task.js';
import PendingRegistration from '../../models/PendingRegistration.js';
import Settings from '../../models/Settings.js';
import Employee from '../../models/Employee.js';
import Notification from '../../models/Notification.js';
import ActivityLog from '../../models/ActivityLog.js';

// Keep Branch.headName/headEmail/head in sync with User(role='branch-head') for that branch.
const syncBranchHeadUser = async (branch) => {
    const branchName = branch?.name;
    if (!branchName) return;

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

        // If email is already used by some other account, link it if role matches
        const emailTaken = await User.findOne({ email: headEmail.toLowerCase().trim() });
        if (emailTaken) {
            if (emailTaken.role === 'branch-head') {
                branch.head = emailTaken._id;
                await Branch.updateOne({ _id: branch._id }, { head: emailTaken._id });
            }
            return;
        }

        const newUser = await User.create({
            name: headName || headEmail.split('@')[0],
            email: headEmail,
            password: 'branch123', // default; user can change later
            role: 'branch-head',
            department: 'Operations',
            branch: branchName,
            isActive: true
        });

        branch.head = newUser._id;
        await Branch.updateOne({ _id: branch._id }, { head: newUser._id });
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

    if (!branch.head || branch.head.toString() !== existing._id.toString()) {
        branch.head = existing._id;
        await Branch.updateOne({ _id: branch._id }, { head: existing._id });
    }
};

export const getAllBranches = async (req, res) => {
    try {
        const branches = await Branch.find({ isDeleted: { $ne: true } })
            .populate('manager', 'name email avatar')
            .populate('head', 'name email avatar');
        res.json({ success: true, data: branches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDeletedBranches = async (req, res) => {
    try {
        const branches = await Branch.find({ isDeleted: true })
            .populate('manager', 'name email avatar')
            .populate('head', 'name email avatar');
        res.json({ success: true, data: branches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const restoreBranch = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }

        branch.isDeleted = false;
        branch.deletedAt = undefined;
        await branch.save();

        // Restore cascading users and tasks
        await User.updateMany({ branch: branch.name }, { isArchived: false });
        await Task.updateMany({ branch: branch.name }, { isArchived: false });

        res.json({ success: true, message: 'Branch and all its associated users and tasks restored successfully', data: branch });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getBranchById = async (req, res) => {
    try {
        const branch = await Branch.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
            .populate('manager', 'name email avatar')
            .populate('head', 'name email avatar');
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
        // Resolve head and manager ObjectId inputs
        if (req.body.head) {
            const headUser = await User.findById(req.body.head);
            if (headUser) {
                req.body.headName = headUser.name;
                req.body.headEmail = headUser.email;
            }
        }

        const branch = await Branch.create(req.body);
        await syncBranchHeadUser(branch);
        
        // Sync head user role and branch mapping
        if (req.body.head) {
            const headUser = await User.findById(req.body.head);
            if (headUser) {
                await User.updateMany({ branch: branch.name, role: 'branch-head', _id: { $ne: headUser._id } }, { role: 'employee' });
                headUser.role = 'branch-head';
                headUser.branch = branch.name;
                await headUser.save();
            }
        }

        if (req.body.manager) {
            const managerUser = await User.findById(req.body.manager);
            if (managerUser) {
                managerUser.branch = branch.name;
                await managerUser.save();
            }
        }

        // Auto sync to Settings branches array
        const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
        if (settings && !settings.branches.includes(branch.name)) {
            settings.branches.push(branch.name);
            settings.markModified('branches');
            await settings.save();
        }

        const updated = await Branch.findById(branch._id)
            .populate('manager', 'name email avatar')
            .populate('head', 'name email avatar');
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

        // If branch name is changing, check for duplicates and cascade update references
        if (newName && newName !== oldName) {
            const dup = await Branch.findOne({ name: newName, _id: { $ne: req.params.id }, isDeleted: { $ne: true } });
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

        if (req.body.departments) {
            const removedDepts = (branch.departments || []).filter(d => !req.body.departments.includes(d));
            if (removedDepts.length > 0) {
                const activeRemoved = [];
                for (const dept of removedDepts) {
                    const u = await User.countDocuments({ branch: branch.name, department: dept, isArchived: { $ne: true } });
                    const t = await Task.countDocuments({ branch: branch.name, department: dept, isArchived: { $ne: true } });
                    if (u > 0 || t > 0) {
                        activeRemoved.push(`'${dept}' (${u} employee${u !== 1 ? 's' : ''}, ${t} task${t !== 1 ? 's' : ''})`);
                    }
                }
                if (activeRemoved.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Cannot remove department(s) from this branch because they are in active use: ${activeRemoved.join(', ')}. Please transfer the employees and tasks to another department/branch first.`
                    });
                }
            }
        }

        // Handle dynamic head combobox mapping
        if (req.body.head) {
            const headUser = await User.findById(req.body.head);
            if (headUser) {
                req.body.headName = headUser.name;
                req.body.headEmail = headUser.email;

                // Downgrade any existing head for this branch
                await User.updateMany({ branch: newName || oldName, role: 'branch-head', _id: { $ne: headUser._id } }, { role: 'employee' });
                
                headUser.role = 'branch-head';
                headUser.branch = newName || oldName;
                await headUser.save();
            }
        }

        if (req.body.manager) {
            const managerUser = await User.findById(req.body.manager);
            if (managerUser) {
                managerUser.branch = newName || oldName;
                await managerUser.save();
            }
        }

        // Update branch allowed fields
        Object.assign(branch, req.body);
        const updated = await branch.save();

        await syncBranchHeadUser(updated);

        const populatedUpdated = await Branch.findById(updated._id)
            .populate('manager', 'name email avatar')
            .populate('head', 'name email avatar');

        res.json({ success: true, data: populatedUpdated });
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

        // Soft-delete branch
        branch.isDeleted = true;
        branch.deletedAt = new Date();
        await branch.save();

        // Propagate archived state to associated users and tasks
        await User.updateMany({ branch: branch.name }, { isArchived: true });
        await Task.updateMany({ branch: branch.name }, { isArchived: true });

        res.json({ success: true, message: 'Branch soft-deleted successfully, linked users and tasks archived' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getBranchStats = async (req, res) => {
    try {
        const branch = await Branch.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }
        
        const users = await User.find({ branch: branch.name, isArchived: { $ne: true } });
        const tasks = await Task.find({ branch: branch.name, isArchived: { $ne: true } });
        
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