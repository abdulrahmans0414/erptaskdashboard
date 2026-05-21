import Task from '../../models/Task.js';
import User from '../../models/User.js';
import Notification from '../../models/Notification.js';
import Settings from '../../models/Settings.js';
import { sendEmailNotification } from '../../utils/emailService.js';
import eventBus, { EVENTS } from '../../utils/eventBus.js';
import { deleteFromCloudinary } from '../../middleware/uploadMiddleware.js';

// ============ HELPER FUNCTIONS ============
const createNotification = async (userId, title, message, type, taskId) => {
    try {
        await Notification.create({ userId, title, message, type, taskId });
    } catch (error) {
        console.error('Notification error:', error);
    }
};

const createBulkNotifications = async (userIds, title, message, type, taskId) => {
    try {
        const notifications = userIds.map(userId => ({
            userId, title, message, type, taskId
        }));
        await Notification.insertMany(notifications);
    } catch (error) {
        console.error('Bulk notification error:', error);
    }
};

// Safe JSON array parsing helper
const parseMaybeJsonArray = (val) => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val;
    if (typeof val !== 'string') return undefined;
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : undefined;
    } catch {
        if (trimmed.includes(',')) return trimmed.split(',').map(s => s.trim()).filter(Boolean);
        return undefined;
    }
};

// Reusable standard deep population query
const deepPopulateTask = (query) => {
    return query
        .populate('assignedTo assignedBy assignedTeam departmentManager branchHead approvedBy workflow.departmentReview.reviewedBy workflow.branchReview.reviewedBy', 'name email department role branch avatar')
        .populate('individualProgress.userId', 'name email avatar')
        .populate('comments.userId', 'name email avatar role')
        .populate('attempts.comments.userId', 'name email avatar role');
};

// ============ CREATE TASK ============
export const createTask = async (req, res) => {
    try {
        const { 
            title, description, department, assignedTo, assignedTeam,
            dueDate, priority, estimatedHours, estimatedMinutes, 
            isTeamTask, collaboratingDepartments, branch,
            taskFormName, taskFormType
        } = req.body;
        
        if (!title || (!assignedTo && !assignedTeam) || !dueDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Title, assignee, and dueDate are required' 
            });
        }
        
        let taskData = {
            title: String(title).trim(),
            description: description ? String(description).trim() : '',
            department: String(department).trim(),
            assignedBy: req.user._id,
            dueDate: new Date(dueDate),
            priority: priority ? String(priority).trim() : 'medium',
            estimatedHours: estimatedHours ? parseInt(estimatedHours) || 0 : 0,
            estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) || 0 : 0,
            status: 'pending',
            branch: branch ? String(branch).trim() : (req.user.branch || 'Gaurabagh'),
            taskFormName: taskFormName ? String(taskFormName).trim() : '',
            taskFormType: taskFormType ? String(taskFormType).trim() : 'other',
            taskFormAttachments: []
        };

        const uploadedFormFiles = req.uploadedFiles || [];
        if (uploadedFormFiles.length > 0) {
            taskData.taskFormAttachments = uploadedFormFiles.map(f => ({
                filename: f.filename,
                fileUrl: f.fileUrl,
                publicId: f.publicId,
                fileType: f.mimeType,
                fileSize: f.fileSize
            }));
        }
        
        let isTeamTaskBool = false;
        if (typeof isTeamTask === 'string') {
            isTeamTaskBool = isTeamTask.trim().toLowerCase() === 'true';
        } else {
            isTeamTaskBool = Boolean(isTeamTask);
        }

        const rawAssignedTeam = parseMaybeJsonArray(assignedTeam);
        let assignedTeamArr = [];
        if (Array.isArray(rawAssignedTeam)) {
            assignedTeamArr = rawAssignedTeam;
        } else if (assignedTeam) {
            if (Array.isArray(assignedTeam)) {
                assignedTeamArr = assignedTeam;
            } else {
                assignedTeamArr = String(assignedTeam).split(',').map(x => x.trim()).filter(Boolean);
            }
        }

        const collaboratingDeptsArr = parseMaybeJsonArray(collaboratingDepartments) || collaboratingDepartments;

        if (isTeamTaskBool && assignedTeamArr.length > 0) {
            taskData.isTeamTask = true;
            taskData.assignedTeam = assignedTeamArr;
            taskData.individualProgress = assignedTeamArr.map(userId => ({
                userId,
                status: 'pending'
            }));
        } else {
            taskData.assignedTo = assignedTo ? String(assignedTo) : undefined;
        }
        
        if (collaboratingDeptsArr && collaboratingDeptsArr.length > 0) {
            taskData.collaboratingDepartments = collaboratingDeptsArr;
        }
        
        const task = await Task.create(taskData);

        // Auto-assign reviewers
        try {
            const creatorRole = req.user.role;
            const reviewerUpdates = {};

            if (creatorRole === 'department-head') {
                reviewerUpdates.departmentManager = req.user._id;
            } else {
                const deptHead = await User.findOne({
                    role: 'department-head',
                    department: task.department,
                    branch: task.branch,
                    isDeleted: { $ne: true }
                }).select('_id');
                if (deptHead) reviewerUpdates.departmentManager = deptHead._id;
            }

            if (creatorRole === 'branch-head') {
                reviewerUpdates.branchHead = req.user._id;
            } else {
                const branchHead = await User.findOne({
                    role: 'branch-head',
                    branch: task.branch,
                    isDeleted: { $ne: true }
                }).select('_id');
                if (branchHead) reviewerUpdates.branchHead = branchHead._id;
            }

            if (Object.keys(reviewerUpdates).length > 0) {
                await Task.findByIdAndUpdate(task._id, reviewerUpdates);
            }
        } catch (e) {
            console.warn('Reviewer auto-assign failed:', e?.message || e);
        }
        
        // Notifications & Emails
        if (taskData.isTeamTask && assignedTeamArr.length > 0) {
            await createBulkNotifications(
                assignedTeamArr,
                'New Team Task Assigned',
                `You are assigned to team task: "${task.title}"`,
                'task_assigned',
                task._id
            );
            for (const memberId of assignedTeamArr) {
                try {
                    const member = await User.findById(memberId).select('email name');
                    if (member && member.email) {
                        await sendEmailNotification(
                            member.email,
                            'TASK_ASSIGNED',
                            {
                                employeeName: member.name,
                                taskTitle: task.title,
                                dueDate: task.dueDate,
                                priority: task.priority,
                                department: task.department,
                                feedback: task.description || '',
                                taskId: task._id,
                                senderId: req.user._id
                            },
                            task.taskFormAttachments
                        );
                    }
                } catch (emailErr) {
                    console.error(`Failed to send email to team member ${memberId}:`, emailErr.message);
                }
            }
        } else if (taskData.assignedTo) {
            await createNotification(
                taskData.assignedTo,
                'New Task Assigned',
                `You have been assigned: "${task.title}"`,
                'task_assigned',
                task._id
            );
            try {
                const assignee = await User.findById(taskData.assignedTo).select('email name');
                if (assignee && assignee.email) {
                    await sendEmailNotification(
                        assignee.email,
                        'TASK_ASSIGNED',
                        {
                            employeeName: assignee.name,
                            taskTitle: task.title,
                            dueDate: task.dueDate,
                            priority: task.priority,
                            department: task.department,
                            feedback: task.description || '',
                            taskId: task._id,
                            senderId: req.user._id
                        },
                        task.taskFormAttachments
                    );
                }
            } catch (emailErr) {
                console.error('Failed to send task assignment email:', emailErr.message);
            }
        }
        
        const populatedTask = await deepPopulateTask(Task.findById(task._id));
        res.status(201).json({ success: true, data: populatedTask });
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ GET TASKS ============
export const getTasks = async (req, res) => {
    try {
        const { role } = req.user;
        const cleanQueryParam = (val) => (typeof val === 'string' ? val.trim() : undefined);
        
        const search = cleanQueryParam(req.query.search);
        const status = cleanQueryParam(req.query.status);
        const priority = cleanQueryParam(req.query.priority);
        const startDate = cleanQueryParam(req.query.startDate);
        const endDate = cleanQueryParam(req.query.endDate);
        const department = cleanQueryParam(req.query.department);
        const branch = cleanQueryParam(req.query.branch);
        const nextCursor = cleanQueryParam(req.query.nextCursor);
        const assignedTo = cleanQueryParam(req.query.assignedTo);
        const timeFilter = cleanQueryParam(req.query.timeFilter);
        
        const pageVal = Math.max(1, parseInt(req.query.page) || 1);
        const limitVal = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50));
        const skip = (pageVal - 1) * limitVal;
        
        let query = { ...(req.taskFilter || {}) };
        query.isDeleted = { $ne: true };

        // Keyset Cursor Pagination
        if (nextCursor) {
            try {
                const decoded = Buffer.from(nextCursor, 'base64').toString('ascii');
                const [createdAtStr, id] = decoded.split('_');
                if (createdAtStr && id) {
                    query.$or = [
                        { createdAt: { $lt: new Date(createdAtStr) } },
                        { createdAt: new Date(createdAtStr), _id: { $lt: id } }
                    ];
                }
            } catch (err) {
                console.error('Invalid cursor parsing:', err);
            }
        }

        if (department && department !== 'all' && ['admin', 'branch-head', 'hr', 'it'].includes(role)) {
            query.department = department;
        }
        if (branch && branch !== 'all' && role === 'admin') {
            query.branch = branch;
        }

        if (assignedTo) {
            const assignedFilter = [
                { assignedTo: assignedTo },
                { assignedTeam: assignedTo }
            ];
            query.$or = query.$or ? [...query.$or, ...assignedFilter] : assignedFilter;
        }
        if (status && status !== 'all') query.status = status;
        if (priority && priority !== 'all') query.priority = priority;
        
        if (search) {
            query.$and = query.$and || [];
            if (search.length >= 3) {
                query.$and.push({ $text: { $search: search } });
            } else {
                query.$and.push({
                    $or: [
                        { title: { $regex: search, $options: 'i' } },
                        { description: { $regex: search, $options: 'i' } }
                    ]
                });
            }
        }

        if (timeFilter && timeFilter !== 'all') {
            query.createdAt = query.createdAt || {};
            const now = new Date();
            if (timeFilter === 'daily') {
                const start = new Date(now);
                start.setHours(0, 0, 0, 0);
                query.createdAt.$gte = start;
            } else if (timeFilter === 'weekly') {
                const start = new Date(now);
                start.setDate(now.getDate() - 7);
                start.setHours(0, 0, 0, 0);
                query.createdAt.$gte = start;
            } else if (timeFilter === 'monthly') {
                const start = new Date(now);
                start.setMonth(now.getMonth() - 1);
                start.setHours(0, 0, 0, 0);
                query.createdAt.$gte = start;
            }
        } else if (startDate || endDate) {
            const dateQuery = {};
            if (startDate && startDate !== 'null' && startDate !== 'undefined' && !isNaN(new Date(startDate).getTime())) {
                dateQuery.$gte = new Date(startDate);
            }
            if (endDate && endDate !== 'null' && endDate !== 'undefined' && !isNaN(new Date(endDate).getTime())) {
                const d = new Date(endDate);
                d.setHours(23, 59, 59, 999);
                dateQuery.$lte = d;
            }
            if (Object.keys(dateQuery).length > 0) {
                query.createdAt = { ...(query.createdAt || {}), ...dateQuery };
            }
        }
        
        let tasksQuery = Task.find(query).sort({ createdAt: -1, _id: -1 });

        if (!nextCursor) {
            tasksQuery = tasksQuery.skip(skip);
        }

        const tasks = await deepPopulateTask(tasksQuery.limit(limitVal + 1)).lean();

        const hasNextPage = tasks.length > limitVal;
        if (hasNextPage) {
            tasks.pop();
        }

        let nextCursorEncoded = null;
        if (tasks.length > 0 && hasNextPage) {
            const lastTask = tasks[tasks.length - 1];
            const cursorPayload = `${new Date(lastTask.createdAt).toISOString()}_${lastTask._id}`;
            nextCursorEncoded = Buffer.from(cursorPayload).toString('base64');
        }

        const total = await Task.countDocuments(query);

        res.json({ 
            success: true, 
            data: tasks,
            nextCursor: nextCursorEncoded,
            pagination: {
                total,
                page: nextCursor ? null : pageVal,
                pages: Math.ceil(total / limitVal)
            }
        });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ success: false, message: 'Error fetching tasks' });
    }
};

// ============ GET TASK BY ID ============
export const getTaskById = async (req, res) => {
    try {
        const taskId = String(req.task?._id || req.params.id);
        const task = await deepPopulateTask(Task.findOne({ _id: taskId, isDeleted: { $ne: true } })).lean();
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        
        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ UPDATE TASK ============
export const updateTask = async (req, res) => {
    try {
        const task = await Task.findOne({ _id: String(req.params.id), isDeleted: { $ne: true } });
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        
        const { title, description, department, assignedTo, dueDate, 
                priority, estimatedHours, estimatedMinutes, branch,
                isTeamTask, assignedTeam, collaboratingDepartments } = req.body;

        const canEditAll = ['admin', 'it', 'department-head', 'branch-head', 'hr'].includes(req.user.role);

        if (canEditAll) {
            if (title) task.title = String(title).trim();
            if (description !== undefined) task.description = String(description).trim();
            if (department) task.department = String(department).trim();
            if (dueDate) task.dueDate = new Date(dueDate);
            if (priority) task.priority = String(priority).trim();
            if (branch) task.branch = String(branch).trim();
            if (estimatedHours !== undefined) task.estimatedHours = parseInt(estimatedHours) || 0;
            if (estimatedMinutes !== undefined) task.estimatedMinutes = parseInt(estimatedMinutes) || 0;
            
            if (isTeamTask !== undefined) task.isTeamTask = Boolean(isTeamTask);
            
            if (task.isTeamTask) {
                if (assignedTeam) task.assignedTeam = assignedTeam;
                if (collaboratingDepartments) task.collaboratingDepartments = collaboratingDepartments;
                task.assignedTo = null;
            } else {
                if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
                task.assignedTeam = [];
                task.collaboratingDepartments = [];
            }
        } else {
            if (description !== undefined) task.description = String(description).trim();
        }
        
        await task.save();
        
        const updatedTask = await deepPopulateTask(Task.findById(task._id));
        res.json({ success: true, data: updatedTask });
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ============ DELETE TASK ============
export const deleteTask = async (req, res) => {
    try {
        const id = String(req.params.id);
        const task = await Task.findOne({ _id: id, isDeleted: { $ne: true } });
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        if (req.user.role !== 'admin' && task.assignedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this task' });
        }

        task.isDeleted = true;
        task.deletedAt = new Date();
        await task.save();

        res.json({ success: true, message: 'Task soft-deleted successfully' });
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ GET DELETED TASKS ============
export const getDeletedTasks = async (req, res) => {
    try {
        const tasks = await deepPopulateTask(Task.find({ isDeleted: true }).sort({ deletedAt: -1 })).lean();
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ RESTORE TASK ============
export const restoreTask = async (req, res) => {
    try {
        const id = String(req.params.id);
        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        task.isDeleted = false;
        task.deletedAt = undefined;
        await task.save();

        const populatedTask = await deepPopulateTask(Task.findById(task._id));
        res.json({ success: true, message: 'Task restored successfully', data: populatedTask });
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ============ START TASK ============
export const startTask = async (req, res) => {
    try {
        const task = await Task.findOne({ _id: String(req.params.id), isDeleted: { $ne: true } });
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        
        const userId = req.user._id.toString();
        const isAssigned = task.assignedTo?.toString() === userId;
        const isTeamMember = task.assignedTeam?.some(m => m.toString() === userId);
        
        if (!isAssigned && !isTeamMember) {
            return res.status(403).json({ 
                success: false, 
                message: 'Only the assigned employee or team members can start this task' 
            });
        }
        
        if (task.status !== 'pending' && task.status !== 'rejected' && task.status !== 'reassigned') {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot start task in "${task.status}" status` 
            });
        }
        
        task.status = 'in-progress';
        task.startedAt = new Date();
        task.currentAttempt = (task.currentAttempt || 0) + 1;

        if (!task.workflow) task.workflow = {};
        task.workflow.departmentReview = { status: 'pending', reviewedAt: null, reviewedBy: null, comments: '' };
        task.workflow.branchReview = { status: 'not-started', reviewedAt: null, reviewedBy: null, comments: '' };
        
        if (!task.attempts) task.attempts = [];
        task.attempts.push({
            attemptNumber: task.currentAttempt,
            startedAt: new Date(),
            status: 'in-progress'
        });
        
        await task.save();

        if (task.assignedBy) {
            const assigner = await User.findById(task.assignedBy).select('email name');
            if (assigner) {
                await createNotification(
                    assigner._id,
                    'Task Started',
                    `${req.user.name} has started working on "${task.title}"`,
                    'task_updated',
                    task._id
                );
                if (assigner.email) {
                    await sendEmailNotification(
                        assigner.email,
                        'TASK_UPDATED',
                        {
                            employeeName: assigner.name,
                            taskTitle: task.title,
                            feedback: `${req.user.name} has started working on this task.`,
                            taskId: task._id,
                            senderId: req.user._id
                        }
                    );
                }
            }
        }
        
        const populatedTask = await deepPopulateTask(Task.findById(task._id));
        res.json({ success: true, data: populatedTask });
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ SUBMIT TASK ============
export const submitTaskWithTime = async (req, res) => {
    try {
        const { submissionNote, actualMinutes } = req.body;
        const task = await Task.findOne({ _id: String(req.params.id), isDeleted: { $ne: true } });
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        
        const userId = req.user._id.toString();
        const isAssigned = task.assignedTo?.toString() === userId;
        const isTeamMember = task.assignedTeam?.some(m => m.toString() === userId);
        
        if (!isAssigned && !isTeamMember) {
            return res.status(403).json({ 
                success: false, 
                message: 'Only the assigned employee or team members can submit this task' 
            });
        }
        
        // Team Task Submission
        if (task.isTeamTask && isTeamMember) {
            const progress = task.individualProgress.find(p => p.userId.toString() === userId);
            if (progress) {
                progress.status = 'submitted';
                progress.submittedAt = new Date();
                progress.submissionNote = submissionNote;

                const uploaded = (req.uploadedFiles || []).map(f => ({
                    filename: f.filename,
                    fileUrl: f.fileUrl,
                    publicId: f.publicId,
                    fileType: f.mimeType,
                    fileSize: f.fileSize
                }));
                if (uploaded.length > 0) {
                    if (!progress.comments) progress.comments = [];
                    progress.comments.push({
                        userId: req.user._id,
                        userName: req.user.name,
                        userRole: req.user.role,
                        message: `Submission attachments (${uploaded.length})`,
                        attachments: uploaded,
                        createdAt: new Date()
                    });
                }
            }
            await task.save();
            eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
            
            const populatedTask = await deepPopulateTask(Task.findById(task._id));
            return res.json({ 
                success: true, 
                data: populatedTask,
                message: 'Your component has been submitted. Waiting for team members to complete.' 
            });
        }
        
        // Individual Task Submission
        if (task.status !== 'in-progress') {
            return res.status(400).json({ 
                success: false, 
                message: 'Task must be in progress to submit' 
            });
        }
        
        const now = new Date();
        let timeSpent = actualMinutes ? parseInt(actualMinutes) : undefined;
        
        if (!timeSpent && task.startedAt) {
            timeSpent = Math.floor((now - task.startedAt) / (1000 * 60));
        }
        
        if (!task.attempts) task.attempts = [];
        if (task.attempts.length === 0) {
            task.attempts.push({
                attemptNumber: task.currentAttempt || 1,
                startedAt: task.startedAt || now,
                status: 'in-progress'
            });
        }
        
        const currentAttempt = task.attempts[task.attempts.length - 1];
        currentAttempt.submittedAt = now;
        currentAttempt.timeSpent = timeSpent || 0;
        currentAttempt.submissionNote = submissionNote ? String(submissionNote).trim() : '';
        const uploaded = (req.uploadedFiles || []).map(f => ({
            filename: f.filename,
            fileUrl: f.fileUrl,
            publicId: f.publicId,
            fileType: f.mimeType,
            fileSize: f.fileSize
        }));
        if (uploaded.length > 0) currentAttempt.submissionAttachments = uploaded;
        currentAttempt.status = 'submitted';
        
        task.submittedAt = now;
        task.submissionNote = submissionNote ? String(submissionNote).trim() : '';
        task.totalTimeSpent = (task.totalTimeSpent || 0) + (timeSpent || 0);
        task.status = 'submitted';

        task.workflow.departmentReview = { status: 'pending', reviewedAt: null, reviewedBy: null, comments: '' };
        task.workflow.branchReview = { status: 'not-started', reviewedAt: null, reviewedBy: null, comments: '' };
        
        await task.save();
        
        // Determine reviewer
        let reviewerId = null;
        if (['employee', 'graphic', 'hr', 'it'].includes(req.user.role)) {
            reviewerId = task.departmentManager
                ? task.departmentManager
                : (await User.findOne({
                    role: 'department-head',
                    department: task.department,
                    branch: task.branch,
                    isDeleted: { $ne: true }
                }).select('_id'))?._id;
        } else if (req.user.role === 'department-head') {
            reviewerId = task.branchHead
                ? task.branchHead
                : (await User.findOne({
                    role: 'branch-head',
                    branch: task.branch,
                    isDeleted: { $ne: true }
                }).select('_id'))?._id;
        } else if (task.assignedBy && task.assignedBy.toString() !== req.user._id.toString()) {
            reviewerId = task.assignedBy;
        }

        if (reviewerId) {
            const reviewer = await User.findById(reviewerId).select('email name');
            if (reviewer) {
                await createNotification(
                    reviewer._id,
                    'Task Submitted for Review',
                    `${req.user.name} submitted "${task.title}" for review`,
                    'task_submitted',
                    task._id
                );

                if (reviewer.email) {
                    await sendEmailNotification(
                        reviewer.email,
                        'TASK_SUBMITTED',
                        {
                            employeeName: reviewer.name,
                            taskTitle: task.title,
                            dueDate: task.dueDate,
                            priority: task.priority,
                            department: task.department,
                            feedback: `${req.user.name} submitted this task for review.\n\nNote: ${task.submissionNote}`,
                            taskId: task._id,
                            senderId: req.user._id
                        },
                        uploaded
                    );
                }
            }
        }

        await createNotification(
            req.user._id,
            'Task Submitted Successfully',
            `Your task "${task.title}" has been submitted for review.`,
            'task_updated',
            task._id
        );
        
        const populatedTask = await deepPopulateTask(Task.findById(task._id));
        res.json({ 
            success: true, 
            data: populatedTask,
            message: `Task submitted successfully!` 
        });
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ REVIEW TASK ============
export const reviewTask = async (req, res) => {
    try {
        const { status, adminComments } = req.body;
        const task = await Task.findOne({ _id: String(req.params.id), isDeleted: { $ne: true } });
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        
        const isAdmin = req.user.role === 'admin';
        const isDeptHead = req.user.role === 'department-head' && task.department === req.user.department && task.branch === req.user.branch;
        const isBranchHead = req.user.role === 'branch-head' && task.branch === req.user.branch;

        const isDeptReviewer = isDeptHead && (!task.departmentManager || task.departmentManager.toString() === req.user._id.toString());
        const isBranchReviewer = isBranchHead && (!task.branchHead || task.branchHead.toString() === req.user._id.toString());
        const isAssigner = task.assignedBy?.toString() === req.user._id.toString();

        if (!isAdmin && !isDeptReviewer && !isBranchReviewer && !isAssigner) {
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized to review this task' 
            });
        }
        
        if (task.status !== 'submitted') {
            return res.status(400).json({ 
                success: false, 
                message: 'Task must be submitted to be reviewed' 
            });
        }

        const reviewData = {
            status: status,
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
            comments: adminComments || (status === 'approved' ? 'Approved' : 'Rejected')
        };

        if (isAssigner || isAdmin) {
            if (status === 'approved') {
                task.status = 'approved';
                task.workflow.departmentReview = { ...reviewData, status: 'approved' };
                task.workflow.branchReview = { ...reviewData, status: 'approved' };
                task.completedAt = new Date();
                task.approvedAt = new Date();
                task.approvedBy = req.user._id;
            } else {
                task.status = 'rejected';
                task.workflow.departmentReview = { ...reviewData, status: 'rejected' };
                task.workflow.branchReview = { ...reviewData, status: 'rejected' };
            }
        } else if (isDeptReviewer && task.workflow.departmentReview.status === 'pending') {
            if (status === 'approved') {
                task.workflow.departmentReview = { ...reviewData, status: 'approved' };
                task.workflow.branchReview.status = 'pending';
            } else {
                task.status = 'rejected';
                task.workflow.departmentReview = { ...reviewData, status: 'rejected' };
            }
        } else if (isBranchReviewer && task.workflow.branchReview.status === 'pending') {
            if (status === 'approved') {
                task.workflow.branchReview = { ...reviewData, status: 'approved' };
                task.status = 'approved';
                task.completedAt = new Date();
                task.approvedAt = new Date();
                task.approvedBy = req.user._id;
            } else {
                task.status = 'rejected';
                task.workflow.branchReview = { ...reviewData, status: 'rejected' };
            }
        } else {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid review stage flow' 
            });
        }

        task.adminComments = adminComments || (status === 'approved' ? 'Approved.' : 'Needs revision.');
        if (task.attempts && task.attempts.length > 0) {
            const lastAttempt = task.attempts[task.attempts.length - 1];
            if (lastAttempt) {
                lastAttempt.status = status;
                lastAttempt.adminFeedback = adminComments;
            }
        }

        await task.save();

        // Send review notifications
        const assignee = await User.findById(task.assignedTo).select('email name');
        if (isDeptReviewer && status === 'approved') {
            const branchHead = task.branchHead
                ? await User.findById(task.branchHead).select('email name')
                : await User.findOne({ role: 'branch-head', branch: task.branch, isDeleted: { $ne: true } }).select('email name');

            if (branchHead) {
                await createNotification(
                    branchHead._id,
                    'Task Ready for Branch Review',
                    `Dept Head approved "${task.title}". Final branch review required.`,
                    'task_submitted',
                    task._id
                );
                if (branchHead.email) {
                    await sendEmailNotification(branchHead.email, 'TASK_SUBMITTED', {
                        employeeName: branchHead.name,
                        taskTitle: task.title,
                        dueDate: task.dueDate,
                        priority: task.priority,
                        department: task.department,
                        feedback: `Dept Head (${req.user.name}) approved "${task.title}". Ready for branch head approval.`,
                        taskId: task._id,
                        senderId: req.user._id
                    });
                }
            }
        } else {
            const notifTitle = status === 'approved' ? '✅ Task Approved!' : '❌ Task Needs Rework';
            const notifMsg = status === 'approved'
                ? `Your task "${task.title}" has been fully approved.`
                : `Your task "${task.title}" needs rework. Comments: ${adminComments}`;

            if (task.assignedTo) {
                await createNotification(task.assignedTo, notifTitle, notifMsg, status === 'approved' ? 'task_approved' : 'task_rejected', task._id);
            }

            if (assignee?.email) {
                await sendEmailNotification(
                    assignee.email,
                    status === 'approved' ? 'TASK_APPROVED' : 'TASK_REJECTED',
                    {
                        employeeName: assignee.name,
                        taskTitle: task.title,
                        dueDate: task.dueDate,
                        priority: task.priority,
                        department: task.department,
                        feedback: adminComments,
                        taskId: task._id,
                        senderId: req.user._id
                    }
                );
            }
        }

        const populatedTask = await deepPopulateTask(Task.findById(task._id));
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
        res.json({
            success: true,
            data: populatedTask,
            message: status === 'approved' ? 'Task approved!' : 'Task rejected.'
        });
    } catch (error) {
        console.error('Review error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ ADD COMMENT ============
export const addComment = async (req, res) => {
    try {
        const { comment } = req.body;
        if (!comment || !String(comment).trim()) {
            return res.status(400).json({ success: false, message: 'Comment text is required' });
        }

        const task = await Task.findOne({ _id: String(req.params.id), isDeleted: { $ne: true } });
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        
        task.comments.push({
            userId: req.user._id,
            userName: req.user.name,
            userRole: req.user.role,
            message: String(comment).trim(),
            createdAt: new Date()
        });
        
        await task.save();
        
        const populatedTask = await deepPopulateTask(Task.findById(task._id));
        res.json({ success: true, data: populatedTask, message: 'Comment added successfully' });
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ GET DEPARTMENT TASKS ============
export const getDepartmentTasks = async (req, res) => {
    try {
        const department = String(req.params.department);
        const tasks = await deepPopulateTask(Task.find({ department, isDeleted: { $ne: true } }).sort({ createdAt: -1 })).lean();
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ GET TEAM TASKS ============
export const getTeamTasks = async (req, res) => {
    try {
        const tasks = await deepPopulateTask(Task.find({ 
            isTeamTask: true,
            isDeleted: { $ne: true },
            $or: [
                { assignedTeam: req.user._id },
                { assignedBy: req.user._id }
            ]
        }).sort({ createdAt: -1 })).lean();
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ UPDATE TEAM PROGRESS ============
export const updateTeamProgress = async (req, res) => {
    try {
        const taskId = String(req.params.taskId);
        const { status, submissionNote } = req.body;
        
        const task = await Task.findOne({ _id: taskId, isDeleted: { $ne: true } });
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        
        const progress = task.individualProgress?.find(p => p.userId.toString() === req.user._id.toString());
        if (progress) {
            progress.status = status;
            if (status === 'submitted') {
                progress.submittedAt = new Date();
                progress.submissionNote = submissionNote ? String(submissionNote).trim() : '';
            }
            await task.save();
        }
        
        const populatedTask = await deepPopulateTask(Task.findById(task._id));
        res.json({ success: true, data: populatedTask });
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ GET DASHBOARD STATS ============
export const getDashboardStats = async (req, res) => {
    try {
        const department = req.query.department ? String(req.query.department).trim() : undefined;
        const branch = req.query.branch ? String(req.query.branch).trim() : undefined;
        const startDate = req.query.startDate ? String(req.query.startDate).trim() : undefined;
        const endDate = req.query.endDate ? String(req.query.endDate).trim() : undefined;
        const timeFilter = req.query.timeFilter ? String(req.query.timeFilter).trim() : undefined;
        
        let query = req.taskFilter ? { ...req.taskFilter } : {};
        query.isDeleted = { $ne: true };

        if (department && department !== 'all') query.department = department;
        if (branch && branch !== 'all') query.branch = branch;
        
        let dateQuery = {};
        if (timeFilter && timeFilter !== 'all') {
            const now = new Date();
            if (timeFilter === 'daily') {
                const start = new Date(now);
                start.setHours(0, 0, 0, 0);
                dateQuery.createdAt = { $gte: start };
            } else if (timeFilter === 'weekly') {
                const start = new Date(now);
                start.setDate(now.getDate() - 7);
                start.setHours(0, 0, 0, 0);
                dateQuery.createdAt = { $gte: start };
            } else if (timeFilter === 'monthly') {
                const start = new Date(now);
                start.setMonth(now.getMonth() - 1);
                start.setHours(0, 0, 0, 0);
                dateQuery.createdAt = { $gte: start };
            }
        } else if (startDate || endDate) {
            dateQuery.createdAt = {};
            if (startDate && !isNaN(new Date(startDate))) {
                dateQuery.createdAt.$gte = new Date(startDate);
            }
            if (endDate && !isNaN(new Date(endDate))) {
                const d = new Date(endDate);
                d.setHours(23, 59, 59, 999);
                dateQuery.createdAt.$lte = d;
            }
        }

        const now = new Date();
        const queryWithDate = { ...query, ...dateQuery };

        const [statsAgg, branchAgg] = await Promise.all([
            Task.aggregate([
                { $match: queryWithDate },
                {
                    $group: {
                        _id: null,
                        totalTasks: { $sum: 1 },
                        completedTasks: { $sum: { $cond: [{ $in: ["$status", ["completed", "approved"]] }, 1, 0] } },
                        pendingTasks: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                        inProgressTasks: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
                        submittedTasks: { $sum: { $cond: [{ $eq: ["$status", "submitted"] }, 1, 0] } },
                        rejectedTasks: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
                        urgentTasks: { $sum: { $cond: [{ $eq: ["$priority", "urgent"] }, 1, 0] } },
                        highPriorityTasks: { $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] } },
                        overdueTasks: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $lt: ["$dueDate", now] },
                                            { $not: { $in: ["$status", ["completed", "approved"]] } }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),
            Task.aggregate([
                { $match: queryWithDate },
                { $group: {
                    _id: "$branch",
                    total: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $in: ["$status", ["completed", "approved"]] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                    inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
                    submitted: { $sum: { $cond: [{ $eq: ["$status", "submitted"] }, 1, 0] } }
                }},
                { $sort: { total: -1 } }
            ])
        ]);

        const summaryData = statsAgg[0] || {
            totalTasks: 0,
            completedTasks: 0,
            pendingTasks: 0,
            inProgressTasks: 0,
            submittedTasks: 0,
            rejectedTasks: 0,
            urgentTasks: 0,
            highPriorityTasks: 0,
            overdueTasks: 0
        };

        res.json({
            success: true,
            data: {
                summary: summaryData,
                branchStats: branchAgg.map(b => ({
                    name: b._id || 'Unknown',
                    total: b.total,
                    completed: b.completed,
                    pending: b.pending,
                    inProgress: b.inProgress,
                    submitted: b.submitted
                })),
                recentTasks: []
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ success: false, message: 'Error loading dashboard stats' });
    }
};

// ============ REASSIGN TASK ============
export const reassignTask = async (req, res) => {
    try {
        const id = String(req.params.id);
        const { assignedTo, assignedTeam, isTeamTask, reason } = req.body;
        
        const task = await Task.findOne({ _id: id, isDeleted: { $ne: true } });
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        task.isTeamTask = !!isTeamTask;
        if (isTeamTask) {
            task.assignedTeam = assignedTeam;
            task.assignedTo = null;
        } else {
            task.assignedTo = assignedTo;
            task.assignedTeam = [];
        }

        if (['completed', 'approved', 'submitted'].includes(task.status)) {
            task.status = 'pending';
        }

        task.comments.push({
            userId: req.user._id,
            userName: req.user.name,
            userRole: req.user.role,
            message: `🔄 Task reassigned. Reason: ${reason || 'Not specified'}`,
            createdAt: new Date()
        });

        await task.save();
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });

        // Notify new assignees
        if (isTeamTask && assignedTeam?.length > 0) {
            await createBulkNotifications(
                assignedTeam,
                'Task Reassigned to Team',
                `You are now part of the team for: "${task.title}"`,
                'task_assigned',
                task._id
            );
            for (const memberId of assignedTeam) {
                try {
                    const member = await User.findById(memberId).select('email name');
                    if (member && member.email) {
                        await sendEmailNotification(
                            member.email,
                            'TASK_ASSIGNED',
                            {
                                employeeName: member.name,
                                taskTitle: task.title,
                                dueDate: task.dueDate,
                                priority: task.priority,
                                department: task.department,
                                feedback: task.description || '',
                                taskId: task._id,
                                senderId: req.user._id
                            }
                        );
                    }
                } catch (emailErr) {
                    console.error(`Failed to send email to team member ${memberId}:`, emailErr.message);
                }
            }
        } else if (task.assignedTo) {
            await createNotification(
                task.assignedTo,
                'Task Reassigned to You',
                `You have been assigned to: "${task.title}"`,
                'task_assigned',
                task._id
            );
            try {
                const assignee = await User.findById(task.assignedTo).select('email name');
                if (assignee && assignee.email) {
                    await sendEmailNotification(
                        assignee.email,
                        'TASK_ASSIGNED',
                        {
                            employeeName: assignee.name,
                            taskTitle: task.title,
                            dueDate: task.dueDate,
                            priority: task.priority,
                            department: task.department,
                            feedback: task.description || '',
                            taskId: task._id,
                            senderId: req.user._id
                        }
                    );
                }
            } catch (emailErr) {
                console.error('Failed to send email to assignee:', emailErr.message);
            }
        }

        const populatedTask = await deepPopulateTask(Task.findById(task._id));
        res.json({ success: true, message: 'Task reassigned successfully', data: populatedTask });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ GET EMPLOYEE SUMMARY ============
export const getEmployeeSummary = async (req, res) => {
    try {
        let match = {};
        const { role, department, branch } = req.user;
        
        if (role === 'admin' || role === 'it') {
            match = {};
        } else if (role === 'department-head') {
            match = { department, branch };
        } else if (role === 'branch-head') {
            match = { branch };
        } else if (role === 'hr') {
            match = { department: 'HR' };
        } else {
            return res.json({ success: true, data: [] });
        }
        
        const employees = await User.find({ 
            ...match, 
            role: { $in: ['employee', 'hr', 'it', 'graphic', 'branch-head', 'department-head'] },
            isDeleted: { $ne: true }
        }).select('name department branch role avatar employeeId email phone').lean();

        const employeeIds = employees.map(e => e._id);
        const now = new Date();

        let taskMatch = {};
        if (role === 'department-head') {
            taskMatch.department = department;
            taskMatch.branch = branch;
        } else if (role === 'branch-head') {
            taskMatch.branch = branch;
        }

        const taskStats = await Task.aggregate([
            {
                $match: {
                    ...taskMatch,
                    isDeleted: { $ne: true },
                    $or: [
                        { assignedTo: { $in: employeeIds } },
                        { assignedTeam: { $in: employeeIds } }
                    ]
                }
            },
            {
                $project: {
                    status: 1,
                    dueDate: 1,
                    assignedTo: 1,
                    assignedTeam: 1,
                    isOverdue: {
                        $and: [
                            { $lt: ["$dueDate", now] },
                            { $not: { $in: ["$status", ["completed", "approved"]] } }
                        ]
                    }
                }
            },
            {
                $project: {
                    status: 1,
                    isOverdue: 1,
                    involvedUsers: {
                        $setUnion: [
                            { $cond: [{ $ifNull: ["$assignedTo", false] }, ["$assignedTo"], []] },
                            { $ifNull: ["$assignedTeam", []] }
                        ]
                    }
                }
            },
            { $unwind: "$involvedUsers" },
            { $match: { involvedUsers: { $in: employeeIds } } },
            {
                $group: {
                    _id: "$involvedUsers",
                    total: { $sum: 1 },
                    pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                    inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
                    submitted: { $sum: { $cond: [{ $eq: ["$status", "submitted"] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $in: ["$status", ["approved", "completed"]] }, 1, 0] } },
                    overdue: { $sum: { $cond: ["$isOverdue", 1, 0] } }
                }
            }
        ]);

        const statsMap = taskStats.reduce((acc, curr) => {
            acc[curr._id.toString()] = curr;
            return acc;
        }, {});

        const summary = employees.map(emp => {
            const stats = statsMap[emp._id.toString()] || {
                total: 0, pending: 0, inProgress: 0, submitted: 0, completed: 0, overdue: 0
            };
            return {
                _id: emp._id,
                id: emp._id,
                name: emp.name,
                department: emp.department || emp.role,
                branch: emp.branch,
                avatar: emp.avatar,
                role: emp.role,
                employeeId: emp.employeeId,
                email: emp.email,
                phone: emp.phone,
                totalTasks: stats.total,
                pending: stats.pending,
                inProgress: stats.inProgress,
                submitted: stats.submitted,
                completed: stats.completed,
                overdue: stats.overdue
            };
        });
        
        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Employee summary error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ UPDATE TASK STATUS (Generic) ============
export const updateTaskStatus = async (req, res) => {
    try {
        const { status, submissionNote } = req.body;
        const task = await Task.findOne({ _id: String(req.params.id), isDeleted: { $ne: true } });
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        
        const userId = req.user._id?.toString();
        const isAdminOrIT = ['admin', 'it'].includes(req.user.role);
        const isAssigned = task.assignedTo?.toString() === userId;
        const isTeamMember = task.assignedTeam?.some(m => m.toString() === userId);
        const isAllowedActor = isAdminOrIT || isAssigned || isTeamMember;

        if (!isAllowedActor) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
        }

        if (status === 'start') {
            if (!['pending', 'rejected', 'reassigned'].includes(task.status)) {
                return res.status(400).json({ success: false, message: `Cannot start in "${task.status}" status` });
            }
            task.status = 'in-progress';
            task.startedAt = new Date();
        } else if (status === 'submit') {
            if (task.status !== 'in-progress') {
                return res.status(400).json({ success: false, message: 'Task must be in progress to submit' });
            }
            task.status = 'submitted';
            task.submissionNote = submissionNote ? String(submissionNote).trim() : '';
            task.submittedAt = new Date();
        } else if (status === 'comment' && submissionNote) {
            task.comments.push({
                userId: req.user._id,
                userName: req.user.name,
                userRole: req.user.role,
                message: String(submissionNote).trim(),
                createdAt: new Date()
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid status update. Allowed: start, submit, comment.'
            });
        }
        
        await task.save();
        
        const populatedTask = await deepPopulateTask(Task.findById(task._id));
        res.json({ success: true, data: populatedTask });
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ GET TIME REPORT ============
export const getTimeReport = async (req, res) => {
    try {
        const startDate = req.query.startDate ? String(req.query.startDate).trim() : undefined;
        const endDate = req.query.endDate ? String(req.query.endDate).trim() : undefined;
        const department = req.query.department ? String(req.query.department).trim() : undefined;
        let query = { ...(req.taskFilter || {}) };
        query.isDeleted = { $ne: true };
        
        if (startDate || endDate) {
            query.createdAt = query.createdAt || {};
            if (startDate && !isNaN(new Date(startDate))) query.createdAt.$gte = new Date(startDate);
            if (endDate && !isNaN(new Date(endDate))) {
                const d = new Date(endDate);
                d.setHours(23, 59, 59, 999);
                query.createdAt.$lte = d;
            }
        }
        if (department && department !== 'all') {
            query.department = department;
        }
        
        const tasks = await deepPopulateTask(Task.find(query).sort({ createdAt: -1 })).lean();
        res.json({ success: true, data: tasks });
    } catch (error) {
        console.error('Time report error:', error);
        res.status(500).json({ success: false, message: 'Error generating time report' });
    }
};