import express from 'express';
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUsersByDepartment,
    getUsersByBranch,
    uploadAvatar,
    getDeletedUsers,
    restoreUser
} from '../controllers/users/userController.js';
import { protect, authorize, filterUsersByAccess, canAccessUser, canUploadAvatar } from '../middleware/auth.js';
import { uploadSingleToCloudinary } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// All routes require token authentication
router.use(protect);

// Scoped user retrieval with role-based data isolation
router.get('/', authorize('admin', 'it', 'branch-head', 'department-head', 'hr'), filterUsersByAccess, getAllUsers);
router.get('/department/:department', authorize('admin', 'it', 'department-head', 'hr'), getUsersByDepartment);
router.get('/branch/:branch', authorize('admin', 'it', 'branch-head', 'department-head'), getUsersByBranch);

// Recycle Bin and Restore operations (Specific paths before parametric :id paths)
router.get('/deleted/all', authorize('admin'), getDeletedUsers);
router.post('/:id/restore', authorize('admin'), restoreUser);

// Image avatar uploads processed via Cloudinary Cloud CDN
router.put('/avatar/:id', canUploadAvatar, uploadSingleToCloudinary('avatars', 'avatar', 2), uploadAvatar);

// Profile detail retrieval and modifications
router.get('/:id', canAccessUser, getUserById);
router.put('/:id', canAccessUser, updateUser);

// Administrative operations
router.post('/', authorize('admin'), createUser);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;