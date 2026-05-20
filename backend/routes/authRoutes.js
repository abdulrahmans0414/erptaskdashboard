import express from 'express';
import {
    signup, getPendingRegistrations, reviewRegistration, verifyOtp,
    checkRegistrationStatus, login, getMe, register, getUsers
} from '../controllers/auth/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
    validateSignup,
    validateLogin,
    validateVerifyOtp,
    validateCreateUser,
    handleValidationErrors
} from '../utils/validationRules.js';
import { blacklistToken } from '../middleware/tokenBlacklist.js';
import { validate, registrationSchema, adminCreateUserSchema } from '../middleware/validate.js';

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────
router.post('/login', validateLogin, handleValidationErrors, login);
router.post('/signup', validate(registrationSchema), signup); // Self-registration request
router.post('/verify-otp', validateVerifyOtp, handleValidationErrors, verifyOtp); // Complete signup with OTP
router.get('/registration-status', checkRegistrationStatus); // Check pending status

// Logout endpoint - blacklist token and clear HTTP-only cookie
router.post('/logout', protect, (req, res) => {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    if (token) {
        blacklistToken(token);
    }
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.json({ success: true, message: 'Logged out successfully' });
});

// ── Admin Protected ───────────────────────────────────────────────
router.post('/register', protect, authorize('admin'), validate(adminCreateUserSchema), register); // Direct admin create
router.get('/pending-registrations', protect, authorize('admin'), getPendingRegistrations);
router.put('/pending-registrations/:id/review', protect, authorize('admin'), reviewRegistration);
router.get('/me', protect, getMe);
router.get('/users', protect, authorize('admin'), getUsers);

export default router;
