import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ============ CORE AUTH MIDDLEWARE ============
export const protect = async (req, res, next) => {
    try {
        let token;
        
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        
        // Support token via query param (for SSE EventSource connections)
        if (!token && req.query.token) {
            token = req.query.token;
        }
        
        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authorized, no token' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        if (!user.isActive) {
            return res.status(401).json({ success: false, message: 'Account is deactivated' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
    }
};

// ============ ROLE AUTHORIZATION ============
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Role '${req.user.role}' is not authorized to access this route` 
            });
        }
        next();
    };
};

// ============ TASK DATA ISOLATION (Simplified) ============
export const buildTaskFilter = (user) => {
    const { role, _id, department, branch } = user;

    if (role === 'admin' || role === 'it') {
        return {};
    }
    if (role === 'department-head') {
        return { department, branch };
    }
    if (role === 'branch-head') {
        return { branch };
    }
    if (role === 'hr') {
        return { department: 'HR' };
    }
    return {
        $or: [
            { assignedTo: _id },
            { assignedTeam: _id }
        ]
    };
};

export const filterTasksByUserAccess = (req, res, next) => {
    req.taskFilter = buildTaskFilter(req.user);
    next();
};

// ============ USER DATA ISOLATION (Simplified) ============
export const filterUsersByAccess = (req, res, next) => {
    const { role, _id, department, branch } = req.user;
    
    if (role === 'admin' || role === 'it') {
        req.userFilter = {};
    } else if (role === 'department-head') {
        req.userFilter = { department, branch };
    } else if (role === 'branch-head') {
        req.userFilter = { branch };
    } else if (role === 'hr') {
        req.userFilter = { department: 'HR' };
    } else {
        // Sirf apna data
        req.userFilter = { _id };
    }
    
    next();
};

// ============ TASK MODIFICATION PERMISSION ============
export const canModifyTask = async (req, res, next) => {
    try {
        const Task = (await import('../models/Task.js')).default;
        const task = await Task.findById(req.params.id);
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        
        const { role, _id, department, branch } = req.user;
        const userId = _id.toString();
        
        // 1. Admin/IT - full access
        if (role === 'admin' || role === 'it') {
            req.task = task;
            return next();
        }
        
        // 2. Assigned user or team member
        const isAssigned = task.assignedTo?.toString() === userId;
        const isTeamMember = task.assignedTeam?.some(m => m.toString() === userId);
        
        if (isAssigned || isTeamMember) {
            req.task = task;
            return next();
        }
        
        // 3. Department Head (same department)
        if (role === 'department-head' && task.department === department && task.branch === branch) {
            req.task = task;
            return next();
        }
        
        // 4. Branch Head (same branch)
        if (role === 'branch-head' && task.branch === branch) {
            req.task = task;
            return next();
        }
        
        // 5. HR (only HR department tasks)
        if (role === 'hr' && task.department === 'HR') {
            req.task = task;
            return next();
        }
        
        return res.status(403).json({ 
            success: false, 
            message: 'You are not authorized to modify this task' 
        });
        
    } catch (error) {
        console.error('canModifyTask error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ USER ACCESS PERMISSION ============
export const canAccessUser = (req, res, next) => {
    const { role, _id, department, branch } = req.user;
    const targetUserId = req.params.id;
    
    // Admin/IT - full access
    if (role === 'admin' || role === 'it') return next();
    
    // Department Head - same dept users
    if (role === 'department-head') {
        req.userFilter = { department, branch };
        return next();
    }
    
    // Branch Head - same branch users
    if (role === 'branch-head') {
        req.userFilter = { branch };
        return next();
    }
    
    // HR - HR department only
    if (role === 'hr') {
        req.userFilter = { department: 'HR' };
        return next();
    }
    
    // Others - only own profile
    if (targetUserId && targetUserId !== _id.toString()) {
        return res.status(403).json({ 
            success: false, 
            message: 'You can only access your own profile' 
        });
    }
    
    return next();
};

// ============ AVATAR UPLOAD PERMISSION ============
// Admin/IT: can upload for anyone
// Branch Head: only users in their branch
// Department Head: only users in their branch+department
// Others: only self
export const canUploadAvatar = async (req, res, next) => {
    try {
        const { role, _id, department, branch } = req.user;
        const targetUserId = req.params.id;

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: 'User id is required' });
        }

        // Admin/IT - full access
        if (role === 'admin' || role === 'it') return next();

        // Self
        if (targetUserId === _id.toString()) return next();

        // Branch/Department heads - scoped access
        if (role === 'branch-head' || role === 'department-head') {
            const filter = role === 'branch-head'
                ? { _id: targetUserId, branch }
                : { _id: targetUserId, branch, department };

            const allowed = await User.findOne(filter).select('_id');
            if (allowed) return next();
        }

        return res.status(403).json({ success: false, message: 'Not authorized to upload avatar for this user' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};