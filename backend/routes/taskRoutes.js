import express from 'express';
import {
    createTask, getTasks, getTaskById, updateTask, deleteTask,
    getDepartmentTasks, getTeamTasks, updateTeamProgress,
    startTask, submitTaskWithTime, reviewTask,
    getDashboardStats, getEmployeeSummary, getTimeReport,
    updateTaskStatus, addComment, reassignTask
} from '../controllers/tasks/taskController.js';
import { protect, authorize, filterTasksByUserAccess, canModifyTask } from '../middleware/auth.js';
import { uploadToCloudinary } from '../middleware/uploadMiddleware.js';

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
    uploadToCloudinary('tasks/forms', 5, 'taskFormFiles', 5),
    createTask
);

// ✅ These MUST come before /:id
router.put('/:id/start', startTask);
router.put(
    '/:id/submit',
    uploadToCloudinary('tasks/submissions', 10, 'submissionAttachments', 5),
    submitTaskWithTime
);
router.put('/:id/review', authorize('admin', 'it', 'department-head', 'branch-head'), reviewTask);
router.put('/:id/status', updateTaskStatus);
router.put('/:id/comment', addComment);
router.put('/:id/reassign', authorize('admin', 'it', 'department-head', 'branch-head', 'hr'), reassignTask);

// Then these
router.get('/:id', canModifyTask, getTaskById);
router.put('/:id', canModifyTask, updateTask);
router.delete('/:id', authorize('admin', 'it'), deleteTask);

export default router;