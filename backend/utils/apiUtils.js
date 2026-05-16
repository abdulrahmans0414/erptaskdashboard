/**
 * apiUtils.js
 * Centralized API response utilities for consistent endpoints
 */

import { ERROR_CODES, getErrorResponse, createErrorResponse } from './errorCodes.js';

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {Object} data - Response data
 */
export const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
    return res.status(statusCode).json({
        success: true,
        message,
        ...(data && { data }),
        timestamp: new Date().toISOString(),
    });
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} errorCode - Error code from ERROR_CODES
 * @param {string} customMessage - Optional custom message
 * @param {Object} additionalData - Additional error details
 */
export const sendError = (res, errorCode = 'INTERNAL_SERVER_ERROR', customMessage = null, additionalData = {}) => {
    const error = ERROR_CODES[errorCode] || ERROR_CODES.INTERNAL_SERVER_ERROR;
    return res.status(error.statusCode).json({
        success: false,
        errorCode: error.code,
        message: customMessage || error.message,
        ...(additionalData && Object.keys(additionalData).length > 0 && { details: additionalData }),
        timestamp: new Date().toISOString(),
    });
};

/**
 * Pagination helper
 * @param {number} page - Current page (1-indexed)
 * @param {number} limit - Items per page
 * @returns {Object} - { skip, limit, page }
 */
export const getPaginationParams = (page = 1, limit = 10) => {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;
    
    return { skip, limit: limitNum, page: pageNum };
};

/**
 * Build pagination response
 * @param {Object} query - MongoDB query object with count
 * @param {array} data - Data array
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} - Paginated response
 */
export const buildPaginationResponse = (query, data, page, limit) => {
    return {
        data,
        pagination: {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            total: query.total || data.length,
            pages: Math.ceil((query.total || data.length) / (parseInt(limit) || 10)),
            hasNext: page * limit < (query.total || data.length),
            hasPrev: page > 1,
        },
    };
};

/**
 * Sanitize user object for response
 * Removes sensitive fields before sending to client
 * @param {Object} user - User document
 * @returns {Object} - Sanitized user object
 */
export const sanitizeUser = (user) => {
    if (!user) return null;
    
    const userObj = user.toObject ? user.toObject() : user;
    
    // Remove sensitive fields
    delete userObj.password;
    delete userObj.twoFactorSecret;
    delete userObj.twoFactorBackupCodes;
    delete userObj.refreshToken;
    delete userObj.__v;
    
    return userObj;
};

/**
 * Sanitize task object for response
 * @param {Object} task - Task document
 * @returns {Object} - Sanitized task object
 */
export const sanitizeTask = (task) => {
    if (!task) return null;
    
    const taskObj = task.toObject ? task.toObject() : task;
    
    // Remove internal fields if needed
    delete taskObj.__v;
    
    return taskObj;
};

/**
 * Build query filter
 * @param {Object} filters - Filter object
 * @returns {Object} - MongoDB query object
 */
export const buildQueryFilter = (filters = {}) => {
    const query = {};
    
    if (filters.search) {
        query.$or = [
            { title: { $regex: filters.search, $options: 'i' } },
            { description: { $regex: filters.search, $options: 'i' } },
        ];
    }
    
    if (filters.status) {
        query.status = filters.status;
    }
    
    if (filters.priority) {
        query.priority = filters.priority;
    }
    
    if (filters.department) {
        query.department = filters.department;
    }
    
    if (filters.branch) {
        query.branch = filters.branch;
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
    
    return query;
};

/**
 * Build sort object
 * @param {string} sortParam - Sort parameter (e.g., "-createdAt,title")
 * @returns {Object} - MongoDB sort object
 */
export const buildSortObject = (sortParam = '') => {
    const sort = {};
    
    if (!sortParam) {
        return { createdAt: -1 }; // Default sort
    }
    
    sortParam.split(',').forEach(field => {
        if (field.startsWith('-')) {
            sort[field.substring(1)] = -1;
        } else {
            sort[field] = 1;
        }
    });
    
    return sort;
};

/**
 * Request logger middleware
 * Logs request details for debugging
 */
export const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const log = {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            user: req.user?._id || 'anonymous',
            ip: req.ip,
            timestamp: new Date().toISOString(),
        };
        
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${log.status}] ${log.method} ${log.path} (${log.duration})`);
        }
    });
    
    next();
};

/**
 * Validate MongoDB ID
 * @param {string} id - ID to validate
 * @returns {boolean}
 */
export const isValidMongoId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Handle async route errors
 * @param {Function} fn - Async route handler
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export default {
    sendSuccess,
    sendError,
    getPaginationParams,
    buildPaginationResponse,
    sanitizeUser,
    sanitizeTask,
    buildQueryFilter,
    buildSortObject,
    requestLogger,
    isValidMongoId,
    asyncHandler,
};
