/**
 * realtimeRoutes.js
 * Server-Sent Events (SSE) endpoint for realtime MongoDB data push.
 * Clients connect once; server pushes task + user updates every 8 seconds.
 */
import express from 'express';
import { protect, buildTaskFilter } from '../middleware/auth.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import eventBus from '../utils/eventBus.js';

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

    // Helper: Push data to client
    const pushData = async () => {
        if (res.writableEnded) return;
        try {
            const taskFilter = buildTaskFilter(req.user);
            const [tasks, userDoc] = await Promise.all([
                Task.find(taskFilter)
                    .populate('assignedTo assignedBy assignedTeam', 'name email department role branch avatar')
                    .sort({ updatedAt: -1 })
                    .limit(5000)
                    .lean(),
                User.findById(req.user._id).select('-password').lean(),
            ]);

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

    // Listen for data changes
    const onChange = async () => {
        await pushData();
    };

    eventBus.on('data_change', onChange);

    // Initial push
    await pushData();
    
    // Heartbeat to keep connection alive
    const heartbeatId = setInterval(() => {
        if (!res.writableEnded) {
            res.write(': heartbeat\n\n');
        }
    }, 30000);

    req.on('close', () => {
        eventBus.off('data_change', onChange);
        clearInterval(heartbeatId);
        removeClient(userId, res);
        try { res.end(); } catch (e) {}
    });
});

export { clients };
export default router;
