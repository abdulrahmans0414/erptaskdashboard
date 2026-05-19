import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
    getEmailLogs,
    getEmailLogById,
    getEmailStats,
    deleteEmailLog,
    bulkDeleteEmailLogs,
    resendEmail,
    syncFromGmail
} from '../controllers/emailLogController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Require admin or IT role for email logs
router.use(authorize('admin', 'it'));

router.get('/stats', getEmailStats);
router.post('/sync', syncFromGmail);
router.delete('/bulk', bulkDeleteEmailLogs);

router.get('/', getEmailLogs);
router.get('/:id', getEmailLogById);
router.delete('/:id', deleteEmailLog);
router.post('/:id/resend', resendEmail);

export default router;
