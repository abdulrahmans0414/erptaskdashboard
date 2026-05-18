import dns from 'dns';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import realtimeRoutes from './routes/realtimeRoutes.js';
import User from './models/User.js';
import { seedDatabase } from './seed.js';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import hpp from 'hpp';
import { initializeTokenCleanup, checkTokenBlacklist } from './middleware/tokenBlacklist.js';
import { handleValidationErrors } from './utils/validationRules.js';

// DNS Configuration - Fix for MongoDB Atlas SRV lookup
dns.setServers(['1.1.1.1', '8.8.8.8']);

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ==================== SECURITY HEADERS ====================
app.use(helmet({
    crossOriginResourcePolicy: false, // Allow cross-origin images/uploads
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", process.env.VITE_API_URL || 'http://localhost:5000'],
        },
    },
}));

// ==================== RATE LIMITING ====================
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500, // Limit each IP to 500 requests per window
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.path === '/', // Don't rate limit health check
});

// Per-user rate limiting for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // 5 attempts per 15 minutes
    keyGenerator: (req) => req.body.email || req.ip, // Rate limit by email
    message: 'Too many login attempts. Please try again after 15 minutes.',
    skip: (req) => req.method !== 'POST' || !req.path.includes('/login'),
});

app.use(globalLimiter);
app.use(loginLimiter);

const PORT = process.env.PORT || 5000;

// CORS Configuration - PRODUCTION UPDATE
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(origin => origin.trim());

// Wildcard patterns for Vercel preview deployments (regex-based)
const allowedOriginPatterns = [
    /^https:\/\/erptaskdashboard(-[a-z0-9]+)*\.vercel\.app$/,  // All Vercel preview URLs for this project
];

const isOriginAllowed = (origin) => {
    if (!origin) return true; // Allow non-browser clients (curl, mobile, etc.)
    if (allowedOrigins.includes(origin)) return true;
    return allowedOriginPatterns.some(pattern => pattern.test(origin));
};

app.use(cors({
    origin: (origin, cb) => {
        if (isOriginAllowed(origin)) {
            cb(null, true);
        } else {
            console.warn(`⚠️ CORS blocked for origin: ${origin}`);
            cb(new Error('CORS not allowed'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ==================== BODY PARSING ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== ADDITIONAL SECURITY ====================
// HPP (HTTP Parameter Pollution) protection
app.use(hpp({
    whitelist: ['sort', 'page', 'limit', 'search', 'filter'],
}));

// Token blacklist checking
app.use('/api/', checkTokenBlacklist);

// NOTE: handleValidationErrors is applied per-route in each router file, not globally.

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'ERP Dashboard API v2.0', 
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/realtime', realtimeRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: `Route ${req.originalUrl} not found` 
    });
});

// Global Error Handler
// NOTE: Must manually set CORS headers here because Express error handlers
// run after middleware, and some error paths skip CORS header injection.
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);

    // Re-apply CORS headers on error responses so the browser
    // sees the real error (500) instead of a misleading CORS error.
    const origin = req.headers.origin;
    if (origin && isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Don't expose CORS error messages to the client
    const isCorsError = err.message === 'CORS not allowed';
    res.status(isCorsError ? 403 : (err.status || 500)).json({ 
        success: false, 
        message: isCorsError ? 'Forbidden' : (err.message || 'Internal server error'),
        ...(process.env.NODE_ENV === 'development' && !isCorsError && { stack: err.stack })
    });
});

// Connect to DB and Start Server
const startServer = async () => {
    await connectDB();
    
    // Initialize token cleanup background job
    initializeTokenCleanup();
    
    // Auto-seed if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
        console.log('⚠️ Database is empty. Seeding database automatically...');
        await seedDatabase(true);
    }

    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
        console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔒 Security: CSRF, HPP, CORS, Rate Limiting enabled`);
    });
};

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});