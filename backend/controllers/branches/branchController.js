import mongoose from 'mongoose';
import Branch from '../../models/Branch.js';
import User from '../../models/User.js';
import Task from '../../models/Task.js';
import PendingRegistration from '../../models/PendingRegistration.js';
import Settings from '../../models/Settings.js';
import Employee from '../../models/Employee.js';
import Notification from '../../models/Notification.js';
import ActivityLog from '../../models/ActivityLog.js';

// Resilient transaction executor to support both standard replica sets (production) and standalone MongoDB instances (local dev fallback)
const runInTransaction = async (workFn) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const result = await workFn(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        const isStandaloneErr = error.codeName === 'CommandNotSupportedOnStandalone' || 
                                error.code === 20 || 
                                error.message.includes('Transaction numbers are only allowed') ||
                                error.message.includes('sessions are not supported');
        if (isStandaloneErr) {
            console.warn('MongoDB transaction not supported in this environment (standalone). Falling back to non-transactional execution.');
            return await workFn(null);
        }
        throw error;
    } finally {
        session.endSession();
    }
};

// Keep Branch.headName/headEmail/head in sync with User(role='branch-head') for that branch.
const syncBranchHeadUser = async (branch, session = null) => {
    const branchName = branch?.name;
    if (!branchName) return;

    const headName = branch?.headName || '';
    const headEmail = branch?.headEmail || '';

    const existingList = await User.find({ role: 'branch-head', branch: branchName }).sort({ createdAt: 1 }).session(session);
    const existing = existingList[0] || null;

    // If duplicates already exist, keep the oldest and delete the rest (safe cleanup).
    if (existingList.length > 1) {
        const dupes = existingList.slice(1).map(u => u._id);
        await User.deleteMany({ _id: { $in: dupes } }, session ? { session } : {});
    }

    if (!existing) {
        if (!headEmail) return; // can't create login account without email

        // If email is already used by some other account, link it if role matches
        const emailTaken = await User.findOne({ email: headEmail.toLowerCase().trim() }).session(session).lean();
        if (emailTaken) {
            if (emailTaken.role === 'branch-head') {
                branch.head = emailTaken._id;
                await Branch.updateOne({ _id: branch._id }, { head: emailTaken._id }, session ? { session } : {});
            }
            return;
        }

        const newUser = await User.create([{
            name: headName || headEmail.split('@')[0],
            email: headEmail,
            password: 'branch123', // default; user can change later
            role: 'branch-head',
            department: 'Operations',
            branch: branchName,
            isActive: true
        }], session ? { session } : {});

        branch.head = newUser[0]._id;
        await Branch.updateOne({ _id: branch._id }, { head: newUser[0]._id }, session ? { session } : {});
        return;
    }

    // Update existing branch-head user
    if (headName) existing.name = headName;
    if (headEmail) {
        const normalized = headEmail.toLowerCase().trim();
        if (normalized !== existing.email) {
            const emailTaken = await User.findOne({ email: normalized, _id: { $ne: existing._id } }).select('_id').session(session).lean();
            if (!emailTaken) existing.email = normalized;
        }
    }
    existing.department = 'Operations';
    existing.isActive = true;
    await existing.save(session ? { session } : {});

    if (!branch.head || branch.head.toString() !== existing._id.toString()) {
        branch.head = existing._id;
        await Branch.updateOne({ _id: branch._id }, { head: existing._id }, session ? { session } : {});
    }
};

export const getAllBranches = async (req, res) => {
    try {
        const search = req.query.search ? String(req.query.search).trim() : undefined;
        const query = { isDeleted: { $ne: true } };
        if (search) {
            query.$or = [
                { name: search },
                { code: search },
                { city: search },
                { location: search },
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }
        const branches = await Branch.find(query)
            .populate('manager', 'name email avatar')
            .populate('head', 'name email avatar')
            .collation({ locale: 'en', strength: 2 })
            .lean();
        res.json({ success: true, data: branches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDeletedBranches = async (req, res) => {
    try {
        const branches = await Branch.find({ isDeleted: true })
            .populate('manager', 'name email avatar')
            .populate('head', 'name email avatar')
            .lean();
        res.json({ success: true, data: branches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const restoreBranch = async (req, res) => {
    try {
        const id = req.params.id;

        const result = await runInTransaction(async (session) => {
            const branch = await Branch.findById(id).session(session);
            if (!branch) {
                return { status: 404, success: false, message: 'Branch not found' };
            }

            branch.isDeleted = false;
            branch.deletedAt = undefined;
            await branch.save(session ? { session } : {});

            // Restore cascading users and tasks
            await User.updateMany({ branch: branch.name }, { isArchived: false }, session ? { session } : {});
            await Task.updateMany({ branch: branch.name }, { isArchived: false }, session ? { session } : {});

            return { success: true, data: branch };
        });

        if (!result.success) {
            return res.status(result.status || 400).json({ success: false, message: result.message });
        }

        res.json({ success: true, message: 'Branch and all its associated users and tasks restored successfully', data: result.data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getBranchById = async (req, res) => {
    try {
        const branch = await Branch.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
            .populate('manager', 'name email avatar')
            .populate('head', 'name email avatar')
            .lean();
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
        const result = await runInTransaction(async (session) => {
            // Resolve head and manager ObjectId inputs
            if (req.body.head) {
                const headUser = await User.findById(req.body.head).session(session);
                if (headUser) {
                    req.body.headName = headUser.name;
                    req.body.headEmail = headUser.email;
                }
            }

            const branches = await Branch.create([req.body], session ? { session } : {});
            const branch = branches[0];
            await syncBranchHeadUser(branch, session);
            
            // Sync head user role and branch mapping
            if (req.body.head) {
                const headUser = await User.findById(req.body.head).session(session);
                if (headUser) {
                    await User.updateMany({ branch: branch.name, role: 'branch-head', _id: { $ne: headUser._id } }, { role: 'employee' }, session ? { session } : {});
                    headUser.role = 'branch-head';
                    headUser.branch = branch.name;
                    await headUser.save(session ? { session } : {});
                }
            }

            if (req.body.manager) {
                const managerUser = await User.findById(req.body.manager).session(session);
                if (managerUser) {
                    managerUser.branch = branch.name;
                    await managerUser.save(session ? { session } : {});
                }
            }

            // Auto sync to Settings branches array
            const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' }).session(session);
            if (settings && !settings.branches.includes(branch.name)) {
                settings.branches.push(branch.name);
                settings.markModified('branches');
                await settings.save(session ? { session } : {});
            }

            const updated = await Branch.findById(branch._id)
                .populate('manager', 'name email avatar')
                .populate('head', 'name email avatar')
                .session(session)
                .lean();
            
            return { success: true, data: updated };
        });

        if (!result.success) {
            return res.status(result.status || 400).json({ success: false, message: result.message });
        }
        res.status(201).json({ success: true, data: result.data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateBranch = async (req, res) => {
    try {
        const id = req.params.id;

        const result = await runInTransaction(async (session) => {
            const branch = await Branch.findById(id).session(session);
            if (!branch) {
                return { status: 404, success: false, message: 'Branch not found' };
            }

            const oldName = branch.name;
            const newName = req.body.name;

            // If branch name is changing, check for duplicates and cascade update references
            if (newName && newName !== oldName) {
                const dup = await Branch.findOne({ name: newName, _id: { $ne: id }, isDeleted: { $ne: true } }).session(session);
                if (dup) {
                    return { status: 400, success: false, message: 'A branch with this name already exists' };
                }

                // Cascade update branch reference across collections
                await User.updateMany({ branch: oldName }, { branch: newName }, session ? { session } : {});
                await Task.updateMany({ branch: oldName }, { branch: newName }, session ? { session } : {});
                await Task.updateMany(
                    { collaboratingBranches: oldName },
                    { $set: { "collaboratingBranches.$[elem]": newName } },
                    { arrayFilters: [{ "elem": oldName }], ...(session ? { session } : {}) }
                );
                await PendingRegistration.updateMany({ branch: oldName }, { branch: newName }, session ? { session } : {});
                await Employee.updateMany({ branch: oldName }, { branch: newName }, session ? { session } : {});

                // Sync with Settings singleton branches and branchEmails map
                const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' }).session(session);
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
                    await settings.save(session ? { session } : {});
                }
            }

            if (req.body.departments) {
                const removedDepts = (branch.departments || []).filter(d => !req.body.departments.includes(d));
                if (removedDepts.length > 0) {
                    const activeRemoved = [];
                    for (const dept of removedDepts) {
                        const u = await User.countDocuments({ branch: branch.name, department: dept, isArchived: { $ne: true } }).session(session);
                        const t = await Task.countDocuments({ branch: branch.name, department: dept, isArchived: { $ne: true } }).session(session);
                        if (u > 0 || t > 0) {
                            activeRemoved.push(`'${dept}' (${u} employee${u !== 1 ? 's' : ''}, ${t} task${t !== 1 ? 's' : ''})`);
                        }
                    }
                    if (activeRemoved.length > 0) {
                        return {
                            status: 400,
                            success: false,
                            message: `Cannot remove department(s) from this branch because they are in active use: ${activeRemoved.join(', ')}. Please transfer the employees and tasks to another department/branch first.`
                        };
                    }
                }
            }

            // Handle dynamic head combobox mapping
            if (req.body.head) {
                const headUser = await User.findById(req.body.head).session(session);
                if (headUser) {
                    req.body.headName = headUser.name;
                    req.body.headEmail = headUser.email;

                    // Downgrade any existing head for this branch
                    await User.updateMany({ branch: newName || oldName, role: 'branch-head', _id: { $ne: headUser._id } }, { role: 'employee' }, session ? { session } : {});
                    
                    headUser.role = 'branch-head';
                    headUser.branch = newName || oldName;
                    await headUser.save(session ? { session } : {});
                }
            }

            if (req.body.manager) {
                const managerUser = await User.findById(req.body.manager).session(session);
                if (managerUser) {
                    managerUser.branch = newName || oldName;
                    await managerUser.save(session ? { session } : {});
                }
            }

            // Update branch allowed fields
            Object.assign(branch, req.body);
            const updated = await branch.save(session ? { session } : {});

            await syncBranchHeadUser(updated, session);

            const populatedUpdated = await Branch.findById(updated._id)
                .populate('manager', 'name email avatar')
                .populate('head', 'name email avatar')
                .session(session)
                .lean();

            return { success: true, data: populatedUpdated };
        });

        if (!result.success) {
            return res.status(result.status || 400).json({ success: false, message: result.message });
        }

        res.json({ success: true, data: result.data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteBranch = async (req, res) => {
    try {
        const id = req.params.id;

        const result = await runInTransaction(async (session) => {
            const branch = await Branch.findById(id).session(session);
            if (!branch) {
                return { status: 404, success: false, message: 'Branch not found' };
            }

            // Soft-delete branch
            branch.isDeleted = true;
            branch.deletedAt = new Date();
            await branch.save(session ? { session } : {});

            // Propagate archived state to associated users and tasks
            await User.updateMany({ branch: branch.name }, { isArchived: true }, session ? { session } : {});
            await Task.updateMany({ branch: branch.name }, { isArchived: true }, session ? { session } : {});

            return { success: true };
        });

        if (!result.success) {
            return res.status(result.status || 400).json({ success: false, message: result.message });
        }

        res.json({ success: true, message: 'Branch soft-deleted successfully, linked users and tasks archived' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getBranchStats = async (req, res) => {
    try {
        const branch = await Branch.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).lean();
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }
        
        const users = await User.find({ branch: branch.name, isArchived: { $ne: true } }).lean();
        const tasks = await Task.find({ branch: branch.name, isArchived: { $ne: true } }).lean();
        
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