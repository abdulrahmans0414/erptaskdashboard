import express from 'express';
import {
    getAllBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch,
    getBranchStats,
    getDeletedBranches,
    restoreBranch
} from '../controllers/branches/branchController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getAllBranches);
router.get('/deleted/all', authorize('admin'), getDeletedBranches);
router.get('/:id', getBranchById);
router.get('/:id/stats', authorize('admin', 'it', 'branch-head'), getBranchStats);
router.post('/', authorize('admin', 'it'), createBranch);
router.put('/:id', authorize('admin', 'it'), updateBranch);
router.post('/:id/restore', authorize('admin', 'it'), restoreBranch);
router.delete('/:id', authorize('admin', 'it'), deleteBranch);

export default router;