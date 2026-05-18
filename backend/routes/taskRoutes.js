import express from 'express';
import {
    createTask, getTasks, getTaskById, updateTask, deleteTask,
    getDepartmentTasks, getTeamTasks, updateTeamProgress,
    startTask, submitTaskWithTime, reviewTask,
    getDashboardStats, getEmployeeSummary, getTimeReport,
    updateTaskStatus, addComment, reassignTask
} from '../controllers/tasks/taskController.js';
import { protect, authorize, filterTasksByUserAccess, canModifyTask } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

const makeStorage = (subdir) => multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join('uploads', 'tasks', subdir);
        ensureDir(dir);
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${subdir}-${uniqueSuffix}${ext}`);
    }
});

const allowedTaskUploadExt = /\.(png|jpe?g|gif|webp|pdf|docx?|xlsx?|pptx?|zip)$/i;
const uploadTaskForm = multer({
    storage: makeStorage('forms'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB each
    fileFilter: function (req, file, cb) {
        const extOk = allowedTaskUploadExt.test(path.extname(file.originalname));
        const mimeOk = Boolean(file.mimetype); // basic check; ext is primary gate
        if (extOk && mimeOk) return cb(null, true);
        cb(new Error('Unsupported file type. Allowed: images, pdf, doc/docx, xls/xlsx, ppt/pptx, zip.'));
    }
});

const uploadTaskSubmission = multer({
    storage: makeStorage('submissions'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB each
    fileFilter: function (req, file, cb) {
        const extOk = allowedTaskUploadExt.test(path.extname(file.originalname));
        const mimeOk = Boolean(file.mimetype);
        if (extOk && mimeOk) return cb(null, true);
        cb(new Error('Unsupported file type. Allowed: images, pdf, doc/docx, xls/xlsx, ppt/pptx, zip.'));
    }
});

const router = express.Router();

router.use(protect);

// Dashboard & Reports
router.get('/dashboard/stats', filterTasksByUserAccess, getDashboardStats);
router.get('/employees/summary', authorize('admin', 'it', 'department-head', 'branch-head', 'hr'), getEmployeeSummary);
router.get('/reports/time', authorize('admin', 'it', 'department-head', 'hr'), getTimeReport);

// Department & Team
router.get('/department/:department', authorize('admin', 'department-head'), getDepartmentTasks);
router.get('/team', getTeamTasks);
router.put('/team-progress/:taskId', updateTeamProgress);

// ✅ IMPORTANT: Specific routes BEFORE /:id routes
router.get('/', filterTasksByUserAccess, getTasks);
router.post(
    '/',
    authorize('admin', 'it', 'department-head', 'branch-head', 'hr'),
    uploadTaskForm.fields([{ name: 'taskFormFiles', maxCount: 5 }]),
    createTask
);

// ✅ These MUST come before /:id
router.put('/:id/start', startTask);           // ✅ Start task
router.put(
    '/:id/submit',
    uploadTaskSubmission.array('submissionAttachments', 10),
    submitTaskWithTime
); // Submit task (with optional attachments)
router.put('/:id/review', authorize('admin', 'it', 'department-head', 'branch-head'), reviewTask); // Review
router.put('/:id/status', updateTaskStatus);   // Status update
router.put('/:id/comment', addComment);        // Add comment
router.put('/:id/reassign', authorize('admin', 'it', 'department-head', 'branch-head', 'hr'), reassignTask); // Reassign

// Then these
router.get('/:id', canModifyTask, getTaskById);
router.put('/:id', canModifyTask, updateTask);
router.delete('/:id', authorize('admin', 'it'), deleteTask);

export default router;