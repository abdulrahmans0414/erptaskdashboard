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
                    .limit(5000) // Restore full capacity for large teams
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
    
    let isConnected = true;
    let timeoutId;

    const scheduleNextPush = () => {
        if (!isConnected) return;
        timeoutId = setTimeout(async () => {
            if (res.writableEnded) {
                isConnected = false;
                return;
            }
            try {
                res.write(`: heartbeat\n\n`);
                await pushData();
                scheduleNextPush();
            } catch (err) {
                console.error('SSE retry error:', err.message);
                isConnected = false;
            }
        }, 10000);
    };

    scheduleNextPush();

    req.on('close', () => {
        isConnected = false;
        clearTimeout(timeoutId);
        removeClient(userId, res);
        try { res.end(); } catch (e) {}
    });
});

export { clients };
export default router;
