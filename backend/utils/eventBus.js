import { EventEmitter } from 'events';

/**
 * Global Event Bus to handle real-time data notifications
 * across different parts of the application.
 */
const eventBus = new EventEmitter();

// Limit the number of listeners to avoid memory leaks
eventBus.setMaxListeners(100);

export const EVENTS = {
    TASK_UPDATED: 'task_updated',
    USER_UPDATED: 'user_updated',
    STATS_UPDATED: 'stats_updated',
    EMAIL_LOG_UPDATED: 'email_log_updated'
};

export const emitDataChange = (userId, type, payload) => {
    eventBus.emit('data_change', { userId, type, payload, timestamp: Date.now() });
};

export default eventBus;
