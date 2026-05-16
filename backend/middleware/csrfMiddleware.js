/**
 * csrfMiddleware.js
 * CSRF protection middleware using csurf
 * Provides CSRF tokens for forms and validates on mutations
 */

import csrf from 'csurf';
import cookieParser from 'cookie-parser';

// CSRF protection middleware
const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict', // Prevent cross-site cookie access
        maxAge: 3600000, // 1 hour
    },
});

/**
 * Middleware chain for CSRF protection
 * Must be used with: cookieParser() middleware
 */
export const csrfMiddleware = [cookieParser(), csrfProtection];

/**
 * Middleware to attach CSRF token to res.locals
 * Tokens are sent in responses for GET requests
 */
export const attachCsrfToken = (req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
};

/**
 * Middleware to validate CSRF on mutations
 * Used only on POST, PUT, PATCH, DELETE routes
 */
export const validateCsrf = csrfProtection;

/**
 * Error handler for CSRF failures
 */
export const csrfErrorHandler = (err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
            success: false,
            errorCode: 'CSRF_TOKEN_INVALID',
            message: 'CSRF token validation failed',
        });
    }
    next(err);
};

export default {
    csrfMiddleware,
    attachCsrfToken,
    validateCsrf,
    csrfErrorHandler,
};
