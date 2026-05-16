/**
 * realtimeRoutes.js
 * Server-Sent Events (SSE) endpoint for realtime MongoDB data push.
 * Clients connect once; server pushes task + user updates every 8 seconds.
 */
import express from 'express';
import { protect } from '../middleware/auth.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

const router = express.Router();

// Store active SSE clients: Map<userId, Set<res>>
const clients = new Map();

const addClient = (userId, res) => {
    if (!clients.has(userId)) clients.set(userId, new Set());
    clients.get(userId).add(res);
};

const removeClient = (userId, res) => {
    clients.get(userId)?.delete(res);
    if (clients.get(userId)?.size === 0) clients.delete(userId);
};

// Helper: build task filter per role (mirrors auth middleware)
const buildTaskFilter = (user) => {
    const { role, _id, department, branch } = user;
    if (role === 'admin' || role === 'it') return {};
    if (role === 'department-head') return { department, branch };
    if (role === 'branch-head') return { branch };
    if (role === 'hr') return { department: 'HR' };
    return { $or: [{ assignedTo: _id }, { assignedTeam: _id }] };
};

// SSE endpoint
router.get('/stream', protect, async (req, res) => {
    // SSE headers
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
    });
    res.flushHeaders();

    const userId = req.user._id.toString();
    addClient(userId, res);

    // Send initial ping
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to realtime stream' })}\n\n`);

    // Push data immediately on connect
    const pushData = async () => {
        try {
            const taskFilter = buildTaskFilter(req.user);

            const [tasks, userDoc] = await Promise.all([
                Task.find(taskFilter)
                    .populate('assignedTo assignedBy assignedTeam', 'name email department role branch avatar')
                    .sort({ updatedAt: -1 })
                    .limit(50)
                    .lean(),
                User.findById(req.user._id).select('-password').lean(),
            ]);

            // Task stats
            const stats = {
                total: tasks.length,
                completed: tasks.filter(t => ['completed', 'approved'].includes(t.status)).length,
                pending: tasks.filter(t => t.status === 'pending').length,
                inProgress: tasks.filter(t => t.status === 'in-progress').length,
                submitted: tasks.filter(t => t.status === 'submitted').length,
                rejected: tasks.filter(t => t.status === 'rejected').length,
                overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !['completed', 'approved'].includes(t.status)).length,
            };

            res.write(`event: tasks\ndata: ${JSON.stringify({ tasks, stats })}\n\n`);
            if (userDoc) {
                res.write(`event: profile\ndata: ${JSON.stringify(userDoc)}\n\n`);
            }
        } catch (err) {
            console.error('SSE push error:', err.message);
        }
    };

    await pushData();

    // Keep-alive heartbeat + data push every 8 seconds
    const interval = setInterval(async () => {
        if (res.writableEnded) {
            clearInterval(interval);
            return;
        }
        // Heartbeat
        res.write(`: heartbeat\n\n`);
        await pushData();
    }, 8000);

    // Cleanup on client disconnect
    req.on('close', () => {
        clearInterval(interval);
        removeClient(userId, res);
        res.end();
    });
});

export { clients };
export default router;
