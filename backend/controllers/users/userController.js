import User from '../../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import eventBus, { EVENTS } from '../../utils/eventBus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Get all users (with pagination, search, and data isolation)
export const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, department, branch, role: filterRole } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Base query from middleware
        let query = req.userFilter ? { ...req.userFilter } : {};

        // Search logic
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
            .limit(parseInt(limit))
            .lean();

        const [total, active, admins] = await Promise.all([
            User.countDocuments(req.userFilter || {}),
            User.countDocuments({ ...(req.userFilter || {}), isActive: true }),
            User.countDocuments({ ...(req.userFilter || {}), role: 'admin' })
        ]);

        res.json({ 
            success: true, 
            data: users,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
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
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // ✅ FIX: Verify the user is accessible under the requester's filter
        const filter = req.userFilter || {};
        if (Object.keys(filter).length > 0) {
            const allowed = await User.findOne({ _id: req.params.id, ...filter }).select('_id');
            if (!allowed) {
                return res.status(403).json({ success: false, message: 'Access denied to this user' });
            }
        }

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new user (Admin only)
// ✅ FIX: Do NOT manually hash – User model pre-save hook handles it
export const createUser = async (req, res) => {
    try {
        const { name, email, password, role, department, branch, phone, address, bloodGroup, dateOfJoining, customFields } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        
        const user = await User.create({
            name, 
            email, 
            password,  // plain text – pre-save hook hashes it
            role: role || 'employee',
            department: department || 'IT',
            branch: branch || 'Gaurabagh',
            phone: phone || null,
            address: address || null,
            bloodGroup: bloodGroup || null,
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

// @desc    Update user (Admin only)
export const updateUser = async (req, res) => {
    try {
        const {
            name, email, role, department, branch, isActive, avatar, password,
            phone, address, bloodGroup, dateOfJoining, customFields
        } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isSelf = req.user._id.toString() === req.params.id;
        const canEditAll = ['admin', 'it'].includes(req.user.role);

        if (canEditAll) {
            if (name) user.name = name;
            if (email) user.email = email;
            if (role) user.role = role;
            if (department) user.department = department;
            if (branch) user.branch = branch;
            if (isActive !== undefined) user.isActive = isActive;
            if (avatar) user.avatar = avatar;
            if (phone !== undefined) user.phone = phone;
            if (address !== undefined) user.address = address;
            if (bloodGroup !== undefined) user.bloodGroup = bloodGroup;
            if (dateOfJoining) user.dateOfJoining = dateOfJoining;
            if (customFields) user.customFields = customFields;
        } else if (isSelf) {
            if (name) user.name = name;
            if (email) user.email = email;
            if (phone !== undefined) user.phone = phone;
            if (address !== undefined) user.address = address;
            if (bloodGroup !== undefined) user.bloodGroup = bloodGroup;
            if (customFields) user.customFields = customFields;
            if (dateOfJoining) user.dateOfJoining = dateOfJoining;
        } else {
            return res.status(403).json({ success: false, message: 'Only admins may update other users' });
        }

        // ✅ FIX: Allow password update for self or admin - pre-save hook will hash it
        if (password && password.trim()) {
            if (isSelf || canEditAll) user.password = password;
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
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // ✅ FIX: Prevent deleting self
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
        }

        // ✅ FIX: SOFT DELETE instead of HARD DELETE for data integrity
        user.isActive = false;
        await user.save();
        
        res.json({ success: true, message: 'User deactivated successfully (Soft Delete)' });
        eventBus.emit('data_change', { type: EVENTS.USER_UPDATED });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get users by department
export const getUsersByDepartment = async (req, res) => {
    try {
        const { department } = req.params;
        const users = await User.find({ department, isActive: true }).select('-password').sort({ name: 1 });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get users by branch
export const getUsersByBranch = async (req, res) => {
    try {
        const { branch } = req.params;
        const users = await User.find({ branch, isActive: true }).select('-password').sort({ name: 1 });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Upload avatar (Admin only)
export const uploadAvatar = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image uploaded' });
        }

        // Delete old avatar if it exists
        if (user.avatar) {
            try {
                const oldImagePath = path.join(__dirname, '..', '..', user.avatar);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            } catch (err) {
                console.error("Error deleting old avatar:", err);
            }
        }
        
        user.avatar = `/uploads/avatars/${req.file.filename}`;
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
