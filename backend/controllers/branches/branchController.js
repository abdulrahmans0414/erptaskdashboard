import Branch from '../../models/Branch.js';
import User from '../../models/User.js';
import Task from '../../models/Task.js';

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
        const branch = await Branch.findByIdAndDelete(req.params.id);
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }

        // If branch is deleted, also delete branch-head user for that branch.
        await User.deleteMany({ role: 'branch-head', branch: branch.name });

        res.json({ success: true, message: 'Branch deleted successfully' });
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