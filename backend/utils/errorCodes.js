/**
 * errorCodes.js
 * Centralized error codes for consistent error responses
 * Helps frontend distinguish between different error types
 */

export const ERROR_CODES = {
    // Authentication Errors (1000-1099)
    INVALID_CREDENTIALS: {
        code: 'INVALID_CREDENTIALS',
        statusCode: 401,
        message: 'Invalid email or password',
    },
    INVALID_OTP: {
        code: 'INVALID_OTP',
        statusCode: 401,
        message: 'Invalid or expired OTP',
    },
    OTP_EXPIRED: {
        code: 'OTP_EXPIRED',
        statusCode: 401,
        message: 'OTP has expired. Please request a new one.',
    },
    TOKEN_EXPIRED: {
        code: 'TOKEN_EXPIRED',
        statusCode: 401,
        message: 'Authentication token has expired',
    },
    TOKEN_INVALID: {
        code: 'TOKEN_INVALID',
        statusCode: 401,
        message: 'Invalid authentication token',
    },
    TOKEN_BLACKLISTED: {
        code: 'TOKEN_BLACKLISTED',
        statusCode: 401,
        message: 'Token has been revoked. Please login again.',
    },
    UNAUTHORIZED: {
        code: 'UNAUTHORIZED',
        statusCode: 401,
        message: 'Unauthorized access',
    },
    FORBIDDEN: {
        code: 'FORBIDDEN',
        statusCode: 403,
        message: 'You do not have permission to perform this action',
    },
    
    // User Errors (2000-2099)
    USER_NOT_FOUND: {
        code: 'USER_NOT_FOUND',
        statusCode: 404,
        message: 'User not found',
    },
    USER_ALREADY_EXISTS: {
        code: 'USER_ALREADY_EXISTS',
        statusCode: 409,
        message: 'User with this email already exists',
    },
    USER_INACTIVE: {
        code: 'USER_INACTIVE',
        statusCode: 403,
        message: 'This user account is inactive',
    },
    EMAIL_NOT_VERIFIED: {
        code: 'EMAIL_NOT_VERIFIED',
        statusCode: 403,
        message: 'Email verification required',
    },
    WEAK_PASSWORD: {
        code: 'WEAK_PASSWORD',
        statusCode: 422,
        message: 'Password is too weak',
    },
    
    // Task Errors (3000-3099)
    TASK_NOT_FOUND: {
        code: 'TASK_NOT_FOUND',
        statusCode: 404,
        message: 'Task not found',
    },
    TASK_ALREADY_STARTED: {
        code: 'TASK_ALREADY_STARTED',
        statusCode: 409,
        message: 'Task has already been started',
    },
    TASK_NOT_SUBMITTED: {
        code: 'TASK_NOT_SUBMITTED',
        statusCode: 409,
        message: 'Task must be submitted first',
    },
    TASK_CANNOT_BE_MODIFIED: {
        code: 'TASK_CANNOT_BE_MODIFIED',
        statusCode: 409,
        message: 'This task cannot be modified in its current state',
    },
    TASK_REVIEW_CONFLICT: {
        code: 'TASK_REVIEW_CONFLICT',
        statusCode: 409,
        message: 'Task is being reviewed by another admin. Please refresh.',
    },
    INVALID_TASK_STATUS_TRANSITION: {
        code: 'INVALID_TASK_STATUS_TRANSITION',
        statusCode: 422,
        message: 'Invalid task status transition',
    },
    
    // Branch/Department Errors (4000-4099)
    BRANCH_NOT_FOUND: {
        code: 'BRANCH_NOT_FOUND',
        statusCode: 404,
        message: 'Branch not found',
    },
    BRANCH_ALREADY_EXISTS: {
        code: 'BRANCH_ALREADY_EXISTS',
        statusCode: 409,
        message: 'Branch with this name already exists',
    },
    DEPARTMENT_NOT_FOUND: {
        code: 'DEPARTMENT_NOT_FOUND',
        statusCode: 404,
        message: 'Department not found',
    },
    DEPARTMENT_ALREADY_EXISTS: {
        code: 'DEPARTMENT_ALREADY_EXISTS',
        statusCode: 409,
        message: 'Department with this name already exists',
    },
    
    // Validation Errors (5000-5099)
    VALIDATION_FAILED: {
        code: 'VALIDATION_FAILED',
        statusCode: 422,
        message: 'Validation failed',
    },
    INVALID_INPUT: {
        code: 'INVALID_INPUT',
        statusCode: 422,
        message: 'Invalid input provided',
    },
    INVALID_ID: {
        code: 'INVALID_ID',
        statusCode: 422,
        message: 'Invalid ID format',
    },
    CSRF_TOKEN_INVALID: {
        code: 'CSRF_TOKEN_INVALID',
        statusCode: 403,
        message: 'CSRF token validation failed',
    },
    
    // Rate Limiting Errors (6000-6099)
    RATE_LIMIT_EXCEEDED: {
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
    },
    BRUTE_FORCE_DETECTED: {
        code: 'BRUTE_FORCE_DETECTED',
        statusCode: 429,
        message: 'Too many failed login attempts. Account locked for 15 minutes.',
    },
    
    // File Upload Errors (7000-7099)
    FILE_TOO_LARGE: {
        code: 'FILE_TOO_LARGE',
        statusCode: 413,
        message: 'File size exceeds maximum allowed size',
    },
    INVALID_FILE_TYPE: {
        code: 'INVALID_FILE_TYPE',
        statusCode: 422,
        message: 'Invalid file type',
    },
    FILE_UPLOAD_FAILED: {
        code: 'FILE_UPLOAD_FAILED',
        statusCode: 500,
        message: 'File upload failed',
    },
    
    // Database Errors (8000-8099)
    DATABASE_ERROR: {
        code: 'DATABASE_ERROR',
        statusCode: 500,
        message: 'Database operation failed',
    },
    DUPLICATE_KEY_ERROR: {
        code: 'DUPLICATE_KEY_ERROR',
        statusCode: 409,
        message: 'Duplicate record found',
    },
    
    // Email Errors (9000-9099)
    EMAIL_SEND_FAILED: {
        code: 'EMAIL_SEND_FAILED',
        statusCode: 500,
        message: 'Failed to send email',
    },
    INVALID_EMAIL: {
        code: 'INVALID_EMAIL',
        statusCode: 422,
        message: 'Invalid email address',
    },
    
    // Server Errors (9500-9999)
    INTERNAL_SERVER_ERROR: {
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        message: 'Internal server error',
    },
    SERVICE_UNAVAILABLE: {
        code: 'SERVICE_UNAVAILABLE',
        statusCode: 503,
        message: 'Service temporarily unavailable',
    },
    NOT_IMPLEMENTED: {
        code: 'NOT_IMPLEMENTED',
        statusCode: 501,
        message: 'Feature not yet implemented',
    },
};

/**
 * Get error response object
 * @param {string} errorCode - Error code key from ERROR_CODES
 * @param {string} customMessage - Optional custom message to override default
 */
export const getErrorResponse = (errorCode, customMessage = null) => {
    const error = ERROR_CODES[errorCode] || ERROR_CODES.INTERNAL_SERVER_ERROR;
    return {
        success: false,
        errorCode: error.code,
        message: customMessage || error.message,
        statusCode: error.statusCode,
    };
};

/**
 * Create standardized error response
 * @param {string} errorCode - Error code key
 * @param {string} customMessage - Optional custom message
 * @param {object} additionalData - Additional error details
 */
export const createErrorResponse = (errorCode, customMessage = null, additionalData = {}) => {
    const error = ERROR_CODES[errorCode] || ERROR_CODES.INTERNAL_SERVER_ERROR;
    return {
        success: false,
        errorCode: error.code,
        message: customMessage || error.message,
        statusCode: error.statusCode,
        ...additionalData,
    };
};

export default {
    ERROR_CODES,
    getErrorResponse,
    createErrorResponse,
};
