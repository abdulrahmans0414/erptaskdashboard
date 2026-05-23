import express from 'express';
import { hardDeleteDocument } from '../controllers/trash/trashController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Token authentication guard for all transactional Trash routes
router.use(protect);

// Permanent "Hard Delete" operation - Administrative access restricted strictly to Admin role
router.delete('/:type/:id', authorize('admin'), hardDeleteDocument);

export default router;
