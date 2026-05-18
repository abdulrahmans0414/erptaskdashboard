/**
 * validationRules.js
 * Centralized validation rules using express-validator
 * Provides consistent input validation across all endpoints
 */

import { body, param, query, validationResult } from 'express-validator';

// ==================== VALIDATION MIDDLEWARE ====================

/**
 * Middleware to handle validation errors
 * Returns 422 with detailed error messages
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            errorCode: 'VALIDATION_FAILED',
            message: 'Validation failed',
            errors: errors.array().map(e => ({
                field: e.param,
                message: e.msg,
                value: e.value
            }))
        });
    }
    next();
};

// ==================== AUTH VALIDATION ====================

export const validateSignup = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email format'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ max: 100 })
        .withMessage('Name must be less than 100 characters'),
    body('branch')
        .notEmpty()
        .withMessage('Branch is required'),
    body('department')
        .notEmpty()
        .withMessage('Department is required'),
    body('role')
        .notEmpty()
        .withMessage('Role is required'),
];

export const validateLogin = [
    // Accept both email addresses AND employee IDs (e.g. EMP001)
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email or Employee ID is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
];

export const validateVerifyOtp = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email format'),
    body('otp')
        .matches(/^\d{6}$/)
        .withMessage('OTP must be 6 digits'),
];

// ==================== USER VALIDATION ====================

export const validateCreateUser = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email format'),
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ max: 50 })
        .escape(),
    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ max: 50 })
        .escape(),
    body('branch')
        .notEmpty()
        .withMessage('Branch is required'),
    body('department')
        .notEmpty()
        .withMessage('Department is required'),
    body('role')
        .notEmpty()
        .withMessage('Role is required'),
    body('phone')
        .optional()
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone must be 10 digits'),
];

export const validateUpdateUser = [
    param('id')
        .isMongoId()
        .withMessage('Invalid user ID'),
    body('firstName')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .escape(),
    body('lastName')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .escape(),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail(),
    body('phone')
        .optional()
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone must be 10 digits'),
    body('branch')
        .optional()
        .trim(),
    body('department')
        .optional()
        .trim(),
];

export const validateDeleteUser = [
    param('id')
        .isMongoId()
        .withMessage('Invalid user ID'),
];

// ==================== TASK VALIDATION ====================

export const validateCreateTask = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Task title is required')
        .isLength({ min: 3, max: 200 })
        .escape(),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Task description is required')
        .isLength({ max: 5000 })
        .escape(),
    body('assignedTo')
        .isMongoId()
        .withMessage('Invalid assigned user ID'),
    body('priority')
        .notEmpty()
        .withMessage('Priority is required')
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority'),
    body('deadline')
        .isISO8601()
        .withMessage('Invalid deadline date')
        .custom(value => {
            if (new Date(value) <= new Date()) {
                throw new Error('Deadline must be in the future');
            }
            return true;
        }),
    body('estimatedMinutes')
        .optional()
        .isInt({ min: 5, max: 480 })
        .withMessage('Estimated time must be between 5 and 480 minutes'),
];

export const validateUpdateTask = [
    param('id')
        .isMongoId()
        .withMessage('Invalid task ID'),
    body('title')
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .escape(),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 5000 })
        .escape(),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority'),
    body('deadline')
        .optional()
        .isISO8601()
        .withMessage('Invalid deadline date'),
];

export const validateReviewTask = [
    param('id')
        .isMongoId()
        .withMessage('Invalid task ID'),
    body('status')
        .notEmpty()
        .withMessage('Review status is required')
        .isIn(['approved', 'rejected', 'request_revision'])
        .withMessage('Invalid status'),
    body('adminComments')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .escape(),
];

export const validateSubmitTask = [
    param('id')
        .isMongoId()
        .withMessage('Invalid task ID'),
    body('submissionNote')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .escape(),
    body('actualMinutes')
        .isInt({ min: 1, max: 480 })
        .withMessage('Actual time must be between 1 and 480 minutes'),
];

// ==================== BRANCH VALIDATION ====================

export const validateCreateBranch = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Branch name is required')
        .isLength({ max: 100 })
        .escape(),
    body('code')
        .trim()
        .notEmpty()
        .withMessage('Branch code is required')
        .isLength({ min: 2, max: 5 })
        .matches(/^[A-Z0-9]+$/)
        .withMessage('Code must be 2-5 uppercase letters/numbers')
        .escape(),
    body('location')
        .trim()
        .notEmpty()
        .withMessage('Location is required')
        .escape(),
    body('address')
        .trim()
        .notEmpty()
        .withMessage('Address is required')
        .escape(),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email format'),
    body('phone')
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone must be 10 digits'),
];

// ==================== PAGINATION VALIDATION ====================

export const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive number'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('sort')
        .optional()
        .matches(/^[a-zA-Z_]+(,-?[a-zA-Z_]+)*$/)
        .withMessage('Invalid sort format'),
];

export default {
    validateSignup,
    validateLogin,
    validateVerifyOtp,
    validateCreateUser,
    validateUpdateUser,
    validateDeleteUser,
    validateCreateTask,
    validateUpdateTask,
    validateReviewTask,
    validateSubmitTask,
    validateCreateBranch,
    validatePagination,
    handleValidationErrors,
};
