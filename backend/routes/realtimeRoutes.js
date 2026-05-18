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

    // Send connected event so client knows SSE is successfully working
    res.write('event: connected\ndata: {"status":"connected"}\n\n');

    const userId = req.user._id.toString();
    addClient(userId, res);

    // Helper: Push data to client
    const pushData = async () => {
        if (res.writableEnded) return;
        try {
            const userDoc = await User.findById(req.user._id).select('-password').lean();

            // Notify frontend to invalidate caches and fetch updated stats/tasks
            res.write(`event: invalidate_tasks\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
            
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
