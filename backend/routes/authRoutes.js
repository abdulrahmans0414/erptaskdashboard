import express from 'express';
import {
    signup, getPendingRegistrations, reviewRegistration, verifyOtp,
    checkRegistrationStatus, login, getMe, register, getUsers
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────
router.post('/login', login);
router.post('/signup', signup);                              // Self-registration request
router.post('/verify-otp', verifyOtp);                       // Complete signup with OTP
router.get('/registration-status', checkRegistrationStatus); // Check pending status

// ── Admin Protected ───────────────────────────────────────────────
router.post('/register', protect, authorize('admin'), register); // Direct admin create
router.get('/pending-registrations', protect, authorize('admin'), getPendingRegistrations);
router.put('/pending-registrations/:id/review', protect, authorize('admin'), reviewRegistration);
router.get('/me', protect, getMe);
router.get('/users', protect, authorize('admin'), getUsers);

export default router;
