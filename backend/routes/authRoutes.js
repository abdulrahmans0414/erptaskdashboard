import express from 'express';
import {
    signup, getPendingRegistrations, reviewRegistration, verifyOtp,
    checkRegistrationStatus, login, getMe, register, getUsers,
    refreshToken, logout
} from '../controllers/auth/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
    validateSignup,
    validateLogin,
    validateVerifyOtp,
    validateCreateUser,
    handleValidationErrors
} from '../utils/validationRules.js';
import { validate, registrationSchema, adminCreateUserSchema } from '../middleware/validate.js';

const router = express.Router();
router.post('/login', validateLogin, handleValidationErrors, login);
router.post('/signup', validate(registrationSchema), signup); // Self-registration request
router.post('/verify-otp', validateVerifyOtp, handleValidationErrors, verifyOtp); // Complete signup with OTP
router.get('/registration-status', checkRegistrationStatus); // Check pending status
router.post('/refresh', refreshToken); // Refresh token endpoint

// Logout endpoint - handled by controller
router.post('/logout', protect, logout);

// ── Admin Protected ───────────────────────────────────────────────
router.post('/register', protect, authorize('admin'), validate(adminCreateUserSchema), register); // Direct admin create
router.get('/pending-registrations', protect, authorize('admin'), getPendingRegistrations);
router.put('/pending-registrations/:id/review', protect, authorize('admin'), reviewRegistration);
router.get('/me', protect, getMe);
router.get('/users', protect, authorize('admin'), getUsers);

export default router;
