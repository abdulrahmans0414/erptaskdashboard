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

// DNS Configuration - Fix for MongoDB Atlas SRV lookup
dns.setServers(['1.1.1.1', '8.8.8.8']);

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Middlewares
app.use(helmet({
    crossOriginResourcePolicy: false, // Allow cross-origin images/uploads
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500, // Limit each IP to 500 requests per window
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});
app.use('/api/', limiter);

const PORT = process.env.PORT || 5000;

// CORS Configuration - PRODUCTION UPDATE
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(origin => origin.trim());

app.use(cors({
    origin: (origin, cb) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
            cb(null, true);
        } else {
            console.warn(`⚠️ CORS blocked for origin: ${origin}`);
            cb(new Error('CORS not allowed'));
        }
    },
    credentials: true
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(err.status || 500).json({ 
        success: false, 
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Connect to DB and Start Server
const startServer = async () => {
    await connectDB();
    
    // Auto-seed if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
        console.log('⚠️ Database is empty. Seeding database automatically...');
        await seedDatabase(true);
    }

    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
        console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
};

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});