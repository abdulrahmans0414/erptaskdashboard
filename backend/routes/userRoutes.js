import express from 'express';
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUsersByDepartment,
    getUsersByBranch,
    uploadAvatar
} from '../controllers/users/userController.js';
import { protect, authorize, filterUsersByAccess, canAccessUser, canUploadAvatar } from '../middleware/auth.js';
import { uploadSingleToCloudinary } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// User management with data isolation
router.get('/', authorize('admin', 'it', 'branch-head', 'department-head', 'hr'), filterUsersByAccess, getAllUsers);
router.get('/department/:department', authorize('admin', 'it', 'department-head', 'hr'), getUsersByDepartment);
router.get('/branch/:branch', authorize('admin', 'it', 'branch-head', 'department-head'), getUsersByBranch);

// ✅ IMPORTANT: Specific routes before :id routes
// Avatar upload now goes to Cloudinary (permanent URL, not local disk)
router.put('/avatar/:id', canUploadAvatar, uploadSingleToCloudinary('avatars', 'avatar', 2), uploadAvatar);

router.get('/:id', canAccessUser, getUserById);
router.put('/:id', canAccessUser, updateUser);

// Sensitive operations - Admin only
router.post('/', authorize('admin'), createUser);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;