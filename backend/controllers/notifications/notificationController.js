import Notification from '../../models/Notification.js';

// GET /api/notifications
export const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);
        const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
        res.json({ success: true, data: notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/notifications/:id/read
export const markAsRead = async (req, res) => {
    try {
        await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true });
        res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req, res) => {
    try {
        await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
