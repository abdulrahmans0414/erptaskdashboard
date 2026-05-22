import User from '../../models/User.js';
import PendingRegistration from '../../models/PendingRegistration.js';
import Notification from '../../models/Notification.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendOTPEmail, sendWelcomeEmail } from '../../utils/emailService.js';

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const generateOTP   = () => crypto.randomInt(100000, 999999).toString();

// ── SELF SIGNUP (public) ──────────────────────────────────────────
export const signup = async (req, res) => {
    try {
        const { name, email, password, phone, role, department, branch, employeeId, designation, privilegeRequestReason } = req.body;

        if (!name || !email || !password || !department)
            return res.status(400).json({ success: false, message: 'Name, email, password and department are required' });
        if (!employeeId)
            return res.status(400).json({ success: false, message: 'Employee ID is required' });
        if (password.length < 6)
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

        const emailRx = /^\S+@\S+\.\S+$/;
        if (!emailRx.test(email))
            return res.status(400).json({ success: false, message: 'Invalid email address' });

        // Prevent privilege escalation via self-signup
        if (role === 'admin') {
            return res.status(400).json({ success: false, message: 'Admin role cannot be requested via signup' });
        }

        const highPrivilegeRoles = ['branch-head', 'department-head'];
        if (role && highPrivilegeRoles.includes(role)) {
            if (!privilegeRequestReason || !privilegeRequestReason.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Reason is required to request Branch Head / Department Head access'
                });
            }
        }

        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ success: false, message: 'This email is already registered. Please login.' });

        const existingPending = await PendingRegistration.findOne({ email, status: { $in: ['pending', 'otp_sent'] } });
        if (existingPending)
            return res.status(400).json({ success: false, message: 'A registration request with this email is already pending admin approval.' });

        await PendingRegistration.create({
            name, email, password,
            phone,
            role: role || 'employee',
            department,
            branch: branch || 'Gaurabagh',
            designation: designation || '',
            employeeId,
            privilegeRequestReason: privilegeRequestReason || ''
        });

        // Notify all admins
        const admins = await User.find({ role: 'admin', isActive: true });
        if (admins.length > 0) {
            await Notification.insertMany(admins.map(a => ({
                userId: a._id,
                title: '🆕 New Registration Request',
                message: `${name} (${email}) from ${department} dept has requested access. Review in Admin Panel.`,
                type: 'registration_request'
            })));
        }

        res.status(201).json({
            success: true,
            message: highPrivilegeRoles.includes(role)
                ? 'High-privilege access request submitted successfully! Admin will review your request. After approval, you will receive an OTP on your email to activate your account.'
                : 'Registration request submitted successfully! Admin will review your request. After approval, you will receive an OTP on your email to activate your account.'
        });
    } catch (error) {
        if (error.code === 11000)
            return res.status(400).json({ success: false, message: 'A pending request with this email already exists.' });
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── ADMIN: GET ALL PENDING REGISTRATIONS ─────────────────────────
export const getPendingRegistrations = async (req, res) => {
    try {
        const { status } = req.query;
        let filter = {};
        if (status && status !== 'all') {
            if (status.includes(',')) {
                filter = { status: { $in: status.split(',') } };
            } else {
                filter = { status };
            }
        } else if (!status || status === 'pending_action') {
            // Default to pending action if no status provided
            filter = { status: { $in: ['pending', 'otp_sent'] } };
        } else if (status === 'all') {
            filter = {};
        }
        const list = await PendingRegistration.find(filter)
            .populate('reviewedBy', 'name email')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: list, count: list.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── ADMIN: SEND OTP VIA EMAIL or REJECT ──────────────────────────
export const reviewRegistration = async (req, res) => {
    try {
        const { action, adminNote } = req.body;
        const pending = await PendingRegistration.findById(req.params.id);

        if (!pending) return res.status(404).json({ success: false, message: 'Request not found' });
        if (pending.status === 'approved') return res.status(400).json({ success: false, message: 'Already approved' });
        if (pending.status === 'rejected') return res.status(400).json({ success: false, message: 'Already rejected' });

        if (action === 'send_otp') {
            const otp = generateOTP();
            pending.otp = otp;
            pending.otpExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
            pending.otpVerified = false;
            pending.status = 'otp_sent';
            pending.adminNote = adminNote || '';
            pending.reviewedBy = req.user._id;
            pending.reviewedAt = new Date();
            await pending.save();

            // 🔑 Send OTP directly to user's Gmail via Nodemailer
            const emailSent = await sendOTPEmail(pending.email, pending.name, otp, pending.otpExpiresAt);

            res.json({
                success: true,
                message: emailSent
                    ? `OTP sent to ${pending.email} via email. User can now verify and activate their account.`
                    : `OTP generated but email failed. OTP: ${otp} (share manually)`,
                emailSent,
                otp: emailSent ? undefined : otp, // Only show in response if email failed
                data: { name: pending.name, email: pending.email }
            });

        } else if (action === 'approve_direct') {
            const existingUser = await User.findOne({ email: pending.email });
            if (existingUser) {
                pending.status = 'rejected';
                pending.adminNote = 'Email already registered.';
                await pending.save();
                return res.status(400).json({ success: false, message: 'Email already registered' });
            }

            const user = await User.create({
                name: pending.name,
                email: pending.email,
                password: pending.password,
                role: pending.role,
                department: pending.department,
                branch: pending.branch,
                employeeId: pending.employeeId,
                phone: pending.phone,
                designation: pending.designation || '',
                privilegeRequestReason: pending.privilegeRequestReason || '',
                isActive: true
            });

            pending.status = 'approved';
            pending.otpVerified = true;
            pending.reviewedBy = req.user._id;
            pending.reviewedAt = new Date();
            pending.adminNote = adminNote || 'Directly approved by admin.';
            await pending.save();

            // Send welcome email
            await sendWelcomeEmail(pending.email, pending.name, pending.role, pending.department);

            res.json({ success: true, message: `${pending.name}'s account created successfully. Welcome email sent.` });

        } else if (action === 'reject') {
            pending.status = 'rejected';
            pending.adminNote = adminNote || 'Request rejected by admin.';
            pending.reviewedBy = req.user._id;
            pending.reviewedAt = new Date();
            await pending.save();

            res.json({ success: true, message: `Registration request from ${pending.name} rejected.` });

        } else {
            res.status(400).json({ success: false, message: 'Invalid action. Use: send_otp | approve_direct | reject' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── USER: VERIFY OTP ─────────────────────────────────────────────
export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

        const pending = await PendingRegistration.findOne({ email, status: 'otp_sent' });
        if (!pending) return res.status(404).json({
            success: false,
            message: 'No OTP request found for this email. Please check your email or contact admin.'
        });

        if (pending.otpExpiresAt < new Date()) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please ask admin to resend.' });
        }

        if (pending.otp !== otp.trim()) {
            return res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: 'Account already exists. Please login.' });

        const user = await User.create({
            name: pending.name,
            email: pending.email,
            password: pending.password,
            role: pending.role,
            department: pending.department,
            branch: pending.branch,
            employeeId: pending.employeeId,
            phone: pending.phone,
            designation: pending.designation || '',
            privilegeRequestReason: pending.privilegeRequestReason || '',
            isActive: true
        });

        pending.status = 'approved';
        pending.otpVerified = true;
        pending.otp = null;
        await pending.save();

        // Send welcome email
        await sendWelcomeEmail(pending.email, pending.name, pending.role, pending.department);

        const token = generateToken(user._id);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.json({
            success: true,
            message: 'OTP verified! Account activated. Welcome to TaskGrid ERP!',
            data: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, branch: user.branch, token }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── CHECK REGISTRATION STATUS (public) ───────────────────────────
export const checkRegistrationStatus = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

        const pending = await PendingRegistration.findOne({ email }).sort({ createdAt: -1 });
        if (!pending) return res.json({ success: true, status: 'not_found' });

        res.json({
            success: true,
            status: pending.status,
            message: {
                pending: 'Your request is pending admin review. You will receive an email when approved.',
                otp_sent: 'Admin has approved your request! Check your email for the OTP to activate your account.',
                approved: 'Your account is active! Please login.',
                rejected: `Your request was rejected. Reason: ${pending.adminNote || 'Contact admin.'}`
            }[pending.status]
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── LOGIN ─────────────────────────────────────────────────────────
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: 'Email/Employee ID and password are required' });

        const user = await User.findOne({ 
            $or: [{ email: email.toLowerCase() }, { employeeId: email }]
        });
        if (!user) {
            const pending = await PendingRegistration.findOne({ 
                $or: [{ email: email.toLowerCase() }, { employeeId: email }]
            });
            if (pending) {
                const msgs = {
                    pending: 'Your account is pending admin approval. You will receive an email when approved.',
                    otp_sent: 'Admin has sent an OTP to your email. Check your inbox and use the "Verify OTP" tab to activate.',
                    rejected: `Your registration was rejected. Reason: ${pending.adminNote || 'Contact admin.'}`
                };
                return res.status(401).json({ success: false, message: msgs[pending.status] || 'Invalid email or password' });
            }
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        if (!user.isActive) return res.status(401).json({ success: false, message: 'Account is deactivated. Contact admin.' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user._id);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.json({
            success: true,
            data: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, branch: user.branch, avatar: user.avatar || null, token }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET ME ────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── ADMIN: Direct register ────────────────────────────────────────
export const register = async (req, res) => {
    try {
        const { name, email, password, role, department, branch } = req.body;
        if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, password required' });

        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ success: false, message: 'User already exists' });

        const user = await User.create({
            name,
            email,
            password,
            role: role || 'employee',
            department: department || 'IT',
            branch: branch || 'Gaurabagh',
            employeeId: req.body.employeeId || undefined,
            phone: req.body.phone || undefined,
            isActive: true
        });

        const token = generateToken(user._id);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.status(201).json({ success: true, data: { _id: user._id, name: user.name, email: user.email, role: user.role, token } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ── GET ALL USERS ─────────────────────────────────────────────────
export const getUsers = async (req, res) => {
    try {
        const { role, branch, department, _id } = req.user;
        let q = role === 'admin' ? {} : role === 'department-head' ? { department, branch } : role === 'branch-head' ? { branch } : { _id };
        const users = await User.find(q).select('-password').sort({ name: 1 });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
