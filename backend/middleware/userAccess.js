import User from '../models/User.js';

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
        req.userFilter = { _id };
    }

    next();
};

export const canAccessUser = (req, res, next) => {
    const { role, _id, department, branch } = req.user;
    const targetUserId = req.params.id;

    if (role === 'admin' || role === 'it') return next();

    if (role === 'department-head') {
        req.userFilter = { department, branch };
        return next();
    }

    if (role === 'branch-head') {
        req.userFilter = { branch };
        return next();
    }

    if (role === 'hr') {
        req.userFilter = { department: 'HR' };
        return next();
    }

    if (targetUserId && targetUserId !== _id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only access your own profile' });
    }

    return next();
};

export const canUploadAvatar = async (req, res, next) => {
    try {
        const { role, _id, department, branch } = req.user;
        const targetUserId = req.params.id;

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: 'User id is required' });
        }

        if (role === 'admin' || role === 'it') return next();
        if (targetUserId === _id.toString()) return next();

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
