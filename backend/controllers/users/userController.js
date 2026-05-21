import User from '../../models/User.js';
import Task from '../../models/Task.js';
import Employee from '../../models/Employee.js';
import Branch from '../../models/Branch.js';
import eventBus, { EVENTS } from '../../utils/eventBus.js';
import { deleteFromCloudinary } from '../../middleware/uploadMiddleware.js';

// @desc    Get all users (with pagination, search, and data isolation)
export const getAllUsers = async (req, res) => {
    try {
        const page = req.query.page ? Math.max(1, parseInt(String(req.query.page)) || 1) : 1;
        const limit = req.query.limit ? Math.max(1, Math.min(100, parseInt(String(req.query.limit)) || 10)) : 10;
        const search = req.query.search ? String(req.query.search).trim() : undefined;
        const department = req.query.department ? String(req.query.department).trim() : undefined;
        const branch = req.query.branch ? String(req.query.branch).trim() : undefined;
        const filterRole = req.query.role ? String(req.query.role).trim() : undefined;
        
        const skip = (page - 1) * limit;

        // Base query from data isolation middleware
        let query = req.userFilter ? { ...req.userFilter } : {};
        query.isDeleted = { $ne: true };

        // Search logic with injection protection
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { employeeId: { $regex: search, $options: 'i' } }
            ];
        }

        // Additional filters
        if (department && department !== 'all') query.department = department;
        if (branch && branch !== 'all') query.branch = branch;
        if (filterRole && filterRole !== 'all') query.role = filterRole;

        const users = await User.find(query)
            .select('-password')
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const [total, active, admins] = await Promise.all([
            User.countDocuments({ ...(req.userFilter || {}), isDeleted: { $ne: true } }),
            User.countDocuments({ ...(req.userFilter || {}), isActive: true, isDeleted: { $ne: true } }),
            User.countDocuments({ ...(req.userFilter || {}), role: 'admin', isDeleted: { $ne: true } })
        ]);

        res.json({ 
            success: true, 
            data: users,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            },
            stats: {
                total,
                active,
                admins
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get user by ID
export const getUserById = async (req, res) => {
    try {
        const id = String(req.params.id);
        const user = await User.findOne({ _id: id, isDeleted: { $ne: true } }).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify user is accessible under requester's scoped access filter
        const filter = req.userFilter || {};
        if (Object.keys(filter).length > 0) {
            const allowed = await User.findOne({ _id: id, ...filter }).select('_id');
            if (!allowed) {
                return res.status(403).json({ success: false, message: 'Access denied to this user profile' });
            }
        }

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new user (Admin only)
export const createUser = async (req, res) => {
    try {
        const { name, email, password, role, department, branch, phone, address, bloodGroup, dateOfJoining, customFields } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        // Cross-Component branch/department validation
        const targetBranchName = branch ? String(branch).trim() : 'Gaurabagh';
        const targetDeptName = department ? String(department).trim() : 'IT';

        const targetBranch = await Branch.findOne({ 
            name: { $regex: new RegExp('^' + targetBranchName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
            isDeleted: { $ne: true }
        });

        if (!targetBranch) {
            return res.status(400).json({ success: false, message: `Target branch "${targetBranchName}" does not exist or is deleted` });
        }

        const deptExists = targetBranch.departments.some(d => d.toLowerCase() === targetDeptName.toLowerCase());
        if (!deptExists) {
            return res.status(400).json({ 
                success: false, 
                message: `Department "${targetDeptName}" does not exist in branch "${targetBranch.name}". Mapped departments are: ${targetBranch.departments.join(', ')}` 
            });
        }
        
        const user = await User.create({
            name: String(name).trim(), 
            email: String(email).trim().toLowerCase(), 
            password: String(password),  // hashed by pre-save schema hook
            role: role ? String(role).trim() : 'employee',
            department: targetDeptName,
            branch: targetBranch.name,
            phone: phone ? String(phone).trim() : null,
            address: address ? String(address).trim() : null,
            bloodGroup: bloodGroup ? String(bloodGroup).trim() : null,
            dateOfJoining: dateOfJoining || Date.now(),
            customFields: customFields || {},
            isActive: true
        });
        
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.status(201).json({ success: true, data: userWithoutPassword });
        eventBus.emit('data_change', { type: EVENTS.USER_UPDATED });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update user (Admin / Scoped Heads / Self)
export const updateUser = async (req, res) => {
    try {
        const {
            name, email, role, department, branch, isActive, avatar, password,
            phone, address, bloodGroup, dateOfJoining, customFields, employeeId
        } = req.body;
        const id = String(req.params.id);
        const user = await User.findOne({ _id: id, isDeleted: { $ne: true } });
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isSelf = req.user._id.toString() === id;
        const canEditAll = ['admin', 'it'].includes(req.user.role);
        
        // Dynamic access scoping
        const isBranchHead = req.user.role === 'branch-head' && user.branch === req.user.branch;
        const isDeptHead = req.user.role === 'department-head' && user.branch === req.user.branch && user.department === req.user.department;
        const canEditScoped = isBranchHead || isDeptHead;

        if (canEditAll || canEditScoped) {
            // Cross-Component branch/department validation if either changes
            if (branch || department) {
                const targetBranchName = branch ? String(branch).trim() : user.branch;
                const targetDeptName = department ? String(department).trim() : user.department;

                const targetBranch = await Branch.findOne({ 
                    name: { $regex: new RegExp('^' + targetBranchName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
                    isDeleted: { $ne: true }
                });

                if (!targetBranch) {
                    return res.status(400).json({ success: false, message: `Branch "${targetBranchName}" does not exist` });
                }

                const deptExists = targetBranch.departments.some(d => d.toLowerCase() === targetDeptName.toLowerCase());
                if (!deptExists) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Department "${targetDeptName}" is not mapped or active in branch "${targetBranch.name}". Mapped departments are: ${targetBranch.departments.join(', ')}` 
                    });
                }

                // If branch actually changes, cascade update tasks
                if (targetBranch.name !== user.branch) {
                    user.branch = targetBranch.name;
                    await Task.updateMany(
                        { $or: [{ assignedTo: user._id }, { assignedTeam: user._id }] },
                        { branch: targetBranch.name }
                    );
                }
                user.department = targetDeptName;
            }

            if (name) user.name = String(name).trim();
            if (email) user.email = String(email).trim().toLowerCase();
            
            // Validate role update to prevent security escalation
            if (role) {
                if (canEditScoped && role !== user.role) {
                    const elevatedRoles = ['admin', 'it', 'branch-head'];
                    if (elevatedRoles.includes(role)) {
                        return res.status(403).json({ success: false, message: 'You are not authorized to elevate users to high-privilege roles' });
                    }
                }
                user.role = String(role).trim();
            }
            
            if (isActive !== undefined) user.isActive = Boolean(isActive);
            if (avatar) user.avatar = String(avatar);
            if (phone !== undefined) user.phone = phone ? String(phone).trim() : null;
            if (address !== undefined) user.address = address ? String(address).trim() : null;
            if (bloodGroup !== undefined) user.bloodGroup = bloodGroup ? String(bloodGroup).trim() : null;
            if (dateOfJoining) user.dateOfJoining = dateOfJoining;
            if (customFields) user.customFields = customFields;
            if (canEditAll && employeeId !== undefined) user.employeeId = employeeId ? String(employeeId).trim() : undefined;
        } else if (isSelf) {
            // Self-service updates
            if (name) user.name = String(name).trim();
            if (email) user.email = String(email).trim().toLowerCase();
            if (phone !== undefined) user.phone = phone ? String(phone).trim() : null;
            if (address !== undefined) user.address = address ? String(address).trim() : null;
            if (bloodGroup !== undefined) user.bloodGroup = bloodGroup ? String(bloodGroup).trim() : null;
            if (customFields) user.customFields = customFields;
            if (dateOfJoining) user.dateOfJoining = dateOfJoining;
        } else {
            return res.status(403).json({ success: false, message: 'Only admins, authorized heads, or profile owners may update users' });
        }

        // Allow password updates
        if (password && String(password).trim()) {
            if (isSelf || canEditAll || canEditScoped) {
                user.password = String(password); // hashed by pre-save schema hook
            }
        }
        
        await user.save();
        
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.json({ success: true, data: userWithoutPassword });
        eventBus.emit('data_change', { type: EVENTS.USER_UPDATED });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete user (Admin only)
export const deleteUser = async (req, res) => {
    try {
        const id = String(req.params.id);
        const user = await User.findOne({ _id: id, isDeleted: { $ne: true } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Prevent deleting self
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
        }

        // Soft-delete the user
        user.isActive = false;
        user.isDeleted = true;
        user.deletedAt = new Date();
        await user.save();

        // Cross-Component Cascade: Transition all active assigned tasks to 'Unassigned' state (assignedTo = null, status = 'pending')
        await Task.updateMany(
            { assignedTo: user._id, isDeleted: { $ne: true } }, 
            { assignedTo: null, status: 'pending' }
        );
        
        // Remove from task teams
        await Task.updateMany(
            { assignedTeam: user._id, isDeleted: { $ne: true } }, 
            { $pull: { assignedTeam: user._id } }
        );

        // Soft-delete linked Employee profile
        await Employee.updateMany(
            { email: user.email }, 
            { isActive: false, isDeleted: true, deletedAt: new Date() }
        );
        
        res.json({ success: true, message: 'User soft-deleted successfully and tasks cascaded to Unassigned state' });
        eventBus.emit('data_change', { type: EVENTS.USER_UPDATED });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all deleted users (Admin only)
export const getDeletedUsers = async (req, res) => {
    try {
        const users = await User.find({ isDeleted: true }).select('-password').sort({ name: 1 });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Restore a soft-deleted user (Admin only)
export const restoreUser = async (req, res) => {
    try {
        const id = String(req.params.id);
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.isActive = true;
        user.isDeleted = false;
        user.deletedAt = undefined;
        await user.save();

        // Restore Employee profile
        await Employee.updateMany(
            { email: user.email }, 
            { isActive: true, isDeleted: false, deletedAt: undefined }
        );

        res.json({ success: true, message: 'User restored successfully', data: user });
        eventBus.emit('data_change', { type: EVENTS.USER_UPDATED });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Get users by department
export const getUsersByDepartment = async (req, res) => {
    try {
        const department = String(req.params.department);
        const branch = req.query.branch ? String(req.query.branch).trim() : undefined;
        const filter = { department, isActive: true, isDeleted: { $ne: true } };
        if (branch) filter.branch = branch;
        const users = await User.find(filter).select('-password').sort({ name: 1 });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get users by branch
export const getUsersByBranch = async (req, res) => {
    try {
        const branch = String(req.params.branch);
        const users = await User.find({ branch, isActive: true, isDeleted: { $ne: true } }).select('-password').sort({ name: 1 });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Upload avatar
export const uploadAvatar = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!req.uploadedFile) {
            return res.status(400).json({ success: false, message: 'No image file uploaded' });
        }

        // Delete old avatar from Cloudinary if configured
        if (user.avatarPublicId) {
            await deleteFromCloudinary(user.avatarPublicId);
        }

        user.avatar = req.uploadedFile.fileUrl;
        user.avatarPublicId = req.uploadedFile.publicId;
        await user.save();

        res.json({
            success: true,
            data: {
                avatar: user.avatar,
                _id: user._id,
                name: user.name
            },
            message: 'Avatar updated successfully'
        });
        eventBus.emit('data_change', { type: EVENTS.USER_UPDATED });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
