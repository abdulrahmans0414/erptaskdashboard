import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    getEmailLogs,
    deleteEmailLog,
    resendEmailLog
} from '../controllers/emailLogController.js';

const router = express.Router();

// All routes here are protected by JWT authentication
router.use(protect);

router.get('/', getEmailLogs);
router.delete('/:id', deleteEmailLog);
router.post('/:id/resend', resendEmailLog);

export default router;
