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
router.use(authorize('admin', 'it', 'branch-head'));

router.get('/', getAllBranches);
router.get('/deleted/all', authorize('admin'), getDeletedBranches);
router.get('/:id', getBranchById);
router.get('/:id/stats', getBranchStats);
router.post('/', authorize('admin'), createBranch);
router.put('/:id', authorize('admin'), updateBranch);
router.post('/:id/restore', authorize('admin'), restoreBranch);
router.delete('/:id', authorize('admin'), deleteBranch);

export default router;