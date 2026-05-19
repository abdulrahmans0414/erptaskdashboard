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
import emailLogRoutes from './routes/emailLogRoutes.js';
import User from './models/User.js';
import { seedDatabase } from './seed.js';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import hpp from 'hpp';
import { initializeTokenCleanup, checkTokenBlacklist } from './middleware/tokenBlacklist.js';
import { startEmailWorker } from './workers/emailWorker.js';
import logger from './logger.js';

// Load .env FIRST before anything else
dotenv.config();

// DNS Configuration - Fix for MongoDB Atlas SRV lookup
dns.setServers(['1.1.1.1', '8.8.8.8']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable trust proxy so Express knows it is behind a reverse proxy (Render, Heroku, etc.)
app.set('trust proxy', 1);

// ==================== CORS (must be BEFORE Helmet and all routes) ====================
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

// Wildcard patterns for Vercel preview deployments
const allowedOriginPatterns = [
    /^https:\/\/erptaskdashboard(-[a-z0-9]+)*\.vercel\.app$/,
];

const isOriginAllowed = (origin) => {
    if (!origin) return true; // Allow non-browser clients (Render health checks, curl, mobile)
    if (allowedOrigins.includes(origin)) return true;
    return allowedOriginPatterns.some(pattern => pattern.test(origin));
};

app.use(cors({
    origin: (origin, cb) => {
        if (isOriginAllowed(origin)) {
            cb(null, true);
        } else {
            logger.warn(`⚠️ CORS blocked for origin: ${origin}`);
            cb(new Error('CORS not allowed'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Handle OPTIONS preflight for all routes
app.options('*', cors());

// ==================== SECURITY HEADERS ====================
app.use(helmet({
    crossOriginResourcePolicy: false, // Allow cross-origin images/uploads
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
            // Allow SSE connections back to both Render backend and local dev
            connectSrc: [
                "'self'",
                'http://localhost:5001',
                'http://localhost:5000',
                'https://*.onrender.com',
                'https://*.vercel.app',
            ],
        },
    },
}));

// ==================== RATE LIMITING ====================
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500,
    message: { success: false, message: 'Too many requests, please try again in 15 minutes' },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.path === '/' || req.path === '/health',
});

// Login-specific rate limiter (strict)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10, // 10 attempts per 15 minutes (relaxed from 5 to avoid dev frustration)
    keyGenerator: (req) => {
        if (req.body && typeof req.body.email === 'string') {
            return req.body.email.toLowerCase().trim();
        }
        return req.ip || req.headers?.['x-forwarded-for'] || 'unknown';
    },
    message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
    skip: (req) => !(req.method === 'POST' && req.path.includes('/login')),
});

// ==================== BODY PARSING ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(globalLimiter);
app.use(loginLimiter);

// ==================== ADDITIONAL SECURITY ====================
app.use(hpp({
    whitelist: ['sort', 'page', 'limit', 'search', 'filter', 'status', 'type'],
}));

// Token blacklist checking for all /api/ routes
app.use('/api/', checkTokenBlacklist);

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoints
app.get('/', (req, res) => {
    res.json({
        message: 'ERP Dashboard API v2.0',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/email-logs', emailLogRoutes);

app.get('/api/test-email', async (req, res) => {
    try {
        const { sendEmailNotification } = await import('./utils/emailService.js');
        const Task = (await import('./models/Task.js')).default;
        // Mock data with a fake cloudinary URL that throws 401
        await sendEmailNotification('abdulrahmans0414@gmail.com', 'TASK_ASSIGNED', {
            employeeName: 'Test',
            taskTitle: 'Test Task',
        }, [{ filename: 'test.pdf', fileUrl: 'https://httpstat.us/401' }]);
        res.json({ success: true, message: 'Check logs' });
    } catch (e) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Global Error Handler
// Re-apply CORS headers on error so browser sees real error, not misleading CORS error
app.use((err, req, res, next) => {
    logger.error('❌ Server Error:', err.message || err);

    const origin = req.headers.origin;
    if (origin && isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    const isCorsError = err.message === 'CORS not allowed';
    res.status(isCorsError ? 403 : (err.status || 500)).json({
        success: false,
        message: isCorsError ? 'Forbidden' : (err.message || 'Internal server error'),
        ...(process.env.NODE_ENV === 'development' && !isCorsError && { stack: err.stack })
    });
});

// ==================== START SERVER ====================
const PORT = parseInt(process.env.PORT, 10) || 5001;

const startServer = async () => {
    await connectDB();

    // Initialize token cleanup background job
    initializeTokenCleanup();

    // Clean up any masked database email config password so it doesn't break IMAP/SMTP
    try {
        const Settings = (await import('./models/Settings.js')).default;
        const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
        if (settings?.emailConfig?.pass && (settings.emailConfig.pass === '••••••••' || settings.emailConfig.pass === '********')) {
            await Settings.updateOne(
                { singleton: 'SYSTEM_SETTINGS' },
                { $set: { 'emailConfig.pass': '' } }
            );
            logger.info('🧹 Cleaned up invalid masked SMTP password from database (reset to .env fallback)');
        }
    } catch (e) {
        logger.warn('Failed to clean up masked email config password:', e.message);
    }

    // Start background email IMAP sync worker (node-cron)
    startEmailWorker();

    // Auto-seed if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
        logger.info('⚠️ Database is empty. Seeding database automatically...');
        await seedDatabase(true);
    }

    app.listen(PORT, () => {
        logger.info(`✅ Server running on http://localhost:${PORT}`);
        logger.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`🔒 Security: HPP, CORS, Rate Limiting enabled`);
        logger.info(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
    });
};

startServer().catch(err => {
    logger.error('Failed to start server:', err);
    process.exit(1);
});

// Execute test on startup and log to file
setTimeout(async () => {
    try {
        const { sendEmailNotification } = await import('./utils/emailService.js');
        logger.info('📧 Starting startup email test...');
        const res = await sendEmailNotification('abdulrahmans0414@gmail.com', 'TASK_ASSIGNED', {
            employeeName: 'Test',
            taskTitle: 'Test Task',
        }, [{ filename: 'test.pdf', fileUrl: 'https://httpstat.us/401' }]);
        logger.info(`📧 Finished startup email test. Result: ${res}`);
    } catch (e) {
        logger.error(`❌ Startup email test error: ${e.message}\n${e.stack}`);
    }
}, 3000);