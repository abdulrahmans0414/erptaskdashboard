/**
 * auditLogger.js
 * Centralized audit logging for compliance and debugging
 * Logs all important actions for audit trails
 */

import ActivityLog from '../models/ActivityLog.js';

/**
 * Log an audit action
 * @param {string} action - Action type
 * @param {Object} user - User performing action
 * @param {Object} metadata - Additional data about the action
 */
export const logAuditAction = async (action, user, metadata = {}) => {
    try {
        const auditEntry = new ActivityLog({
            userId: user?._id,
            userName: user?.name || user?.email || 'System',
            userRole: user?.role,
            action,
            details: metadata.details || '',
            metadata: {
                ...metadata,
                ipAddress: metadata.ip || 'unknown',
                userAgent: metadata.userAgent || 'unknown',
                timestamp: new Date(),
            },
        });

        await auditEntry.save();
        return { success: true, auditId: auditEntry._id };
    } catch (error) {
        console.error('Error logging audit action:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get audit logs with filters
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 */
export const getAuditLogs = async (filters = {}, page = 1, limit = 50) => {
    try {
        const query = {};

        if (filters.userId) {
            query.userId = filters.userId;
        }

        if (filters.action) {
            query.action = filters.action;
        }

        if (filters.startDate || filters.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                query.createdAt.$lte = new Date(filters.endDate);
            }
        }

        if (filters.userRole) {
            query.userRole = filters.userRole;
        }

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            ActivityLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ActivityLog.countDocuments(query),
        ]);

        return {
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Export audit logs to CSV
 * @param {Object} filters - Filter criteria
 */
export const exportAuditLogs = async (filters = {}) => {
    try {
        const query = {};

        if (filters.userId) {
            query.userId = filters.userId;
        }

        if (filters.action) {
            query.action = filters.action;
        }

        if (filters.startDate || filters.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                query.createdAt.$lte = new Date(filters.endDate);
            }
        }

        const logs = await ActivityLog.find(query).sort({ createdAt: -1 }).lean();

        // Convert to CSV
        const headers = ['ID', 'User Name', 'User Role', 'Action', 'Details', 'IP Address', 'Timestamp'];
        const rows = logs.map(log => [
            log._id.toString(),
            log.userName,
            log.userRole,
            log.action,
            log.details,
            log.metadata?.ipAddress || 'unknown',
            new Date(log.createdAt).toISOString(),
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

        return { success: true, csv, filename: `audit-logs-${Date.now()}.csv` };
    } catch (error) {
        console.error('Error exporting audit logs:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Common audit actions
 */
export const AUDIT_ACTIONS = {
    // User Actions
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    USER_REGISTRATION: 'user_registration',
    USER_PROFILE_UPDATE: 'user_profile_update',
    USER_PASSWORD_CHANGE: 'user_password_change',
    USER_2FA_ENABLED: 'user_2fa_enabled',
    USER_2FA_DISABLED: 'user_2fa_disabled',

    // Task Actions
    TASK_CREATED: 'task_created',
    TASK_UPDATED: 'task_updated',
    TASK_ASSIGNED: 'task_assigned',
    TASK_STARTED: 'task_started',
    TASK_SUBMITTED: 'task_submitted',
    TASK_REVIEWED: 'task_reviewed',
    TASK_APPROVED: 'task_approved',
    TASK_REJECTED: 'task_rejected',
    TASK_DELETED: 'task_deleted',

    // Admin Actions
    USER_CREATED_BY_ADMIN: 'user_created_by_admin',
    USER_DELETED_BY_ADMIN: 'user_deleted_by_admin',
    USER_ROLE_CHANGED: 'user_role_changed',
    SETTINGS_CHANGED: 'settings_changed',
    BRANCH_CREATED: 'branch_created',
    BRANCH_UPDATED: 'branch_updated',
    BRANCH_DELETED: 'branch_deleted',

    // Data Actions
    DATA_EXPORT: 'data_export',
    DATA_IMPORT: 'data_import',
    REPORT_GENERATED: 'report_generated',

    // Security Actions
    FAILED_LOGIN_ATTEMPT: 'failed_login_attempt',
    INVALID_TOKEN: 'invalid_token',
    PERMISSION_DENIED: 'permission_denied',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
};

/**
 * Middleware to log API access
 */
export const auditMiddleware = (req, res, next) => {
    // Store metadata in request for later logging
    req.auditMetadata = {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        method: req.method,
        path: req.path,
    };

    next();
};

export default {
    logAuditAction,
    getAuditLogs,
    exportAuditLogs,
    AUDIT_ACTIONS,
    auditMiddleware,
};
