import express from 'express';
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUsersByDepartment,
    getUsersByBranch,
    uploadAvatar  // ✅ Import
} from '../controllers/userController.js';
import { protect, authorize, filterUsersByAccess, canAccessUser, canUploadAvatar } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Better multer config - preserve file extension
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/avatars/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'avatar-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
    }
});

const router = express.Router();

// All routes require authentication
router.use(protect);

// User management with data isolation
router.get('/', authorize('admin', 'it', 'department-head', 'hr'), filterUsersByAccess, getAllUsers);
router.get('/department/:department', authorize('admin', 'it', 'department-head'), getUsersByDepartment);
router.get('/branch/:branch', authorize('admin', 'it', 'branch-head'), getUsersByBranch);

// ✅ IMPORTANT: Specific routes before :id routes
router.put('/avatar/:id', canUploadAvatar, upload.single('avatar'), uploadAvatar);

router.get('/:id', canAccessUser, getUserById);
router.put('/:id', canAccessUser, updateUser);

// Sensitive operations - Admin only
router.post('/', authorize('admin'), createUser);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;