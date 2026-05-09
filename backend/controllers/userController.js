import User from '../models/User.js';

// @desc    Get all users (with data isolation via req.userFilter)
export const getAllUsers = async (req, res) => {
    try {
        // ✅ FIX: Use userFilter set by filterUsersByAccess middleware
        const filter = req.userFilter || {};
        const users = await User.find(filter).select('-password').sort({ name: 1 });
        res.json({ success: true, data: users });
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
        const { name, email, password, role, department, branch } = req.body;
        
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
            isActive: true
        });
        
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.status(201).json({ success: true, data: userWithoutPassword });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update user (Admin only)
export const updateUser = async (req, res) => {
    try {
        const { name, email, role, department, branch, isActive, avatar, password } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        if (name) user.name = name;
        if (email) user.email = email;
        if (role) user.role = role;
        if (department) user.department = department;
        if (branch) user.branch = branch;
        if (isActive !== undefined) user.isActive = isActive;
        if (avatar) user.avatar = avatar;
        // ✅ FIX: Allow password update - pre-save hook will hash it
        if (password && password.trim()) user.password = password;
        
        await user.save();
        
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.json({ success: true, data: userWithoutPassword });
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
        
        await user.deleteOne();
        res.json({ success: true, message: 'User deleted successfully' });
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
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
