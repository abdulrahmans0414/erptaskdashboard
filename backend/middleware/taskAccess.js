import Task from '../models/Task.js';
import User from '../models/User.js';

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

export const canModifyTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const { role, _id, department, branch } = req.user;
        const userId = _id.toString();
        const isAssigned = task.assignedTo?.toString() === userId;
        const isTeamMember = task.assignedTeam?.some((m) => m.toString() === userId);

        if (role === 'admin' || role === 'it') {
            req.task = task;
            return next();
        }

        if (isAssigned || isTeamMember) {
            req.task = task;
            return next();
        }

        if (role === 'department-head' && task.department === department && task.branch === branch) {
            req.task = task;
            return next();
        }

        if (role === 'branch-head' && task.branch === branch) {
            req.task = task;
            return next();
        }

        if (role === 'hr' && task.department === 'HR') {
            req.task = task;
            return next();
        }

        return res.status(403).json({ success: false, message: 'You are not authorized to modify this task' });
    } catch (error) {
        console.error('canModifyTask error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
