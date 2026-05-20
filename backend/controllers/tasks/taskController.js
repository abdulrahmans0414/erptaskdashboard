import Task from '../../models/Task.js';
import User from '../../models/User.js';
import Notification from '../../models/Notification.js';
import Settings from '../../models/Settings.js';
import { sendEmailNotification } from '../../utils/emailService.js';
import eventBus, { emitDataChange, EVENTS } from '../../utils/eventBus.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deleteFromCloudinary } from '../../middleware/uploadMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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

// ============ CREATE TASK ============
export const createTask = async (req, res) => {
    try {
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
                // fallback: comma separated
                if (trimmed.includes(',')) return trimmed.split(',').map(s => s.trim()).filter(Boolean);
                return undefined;
            }
        };

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
            title,
            description: description || '',
            department,
            assignedBy: req.user._id,
            dueDate,
            priority: priority || 'medium',
            estimatedHours: estimatedHours || 0,
            estimatedMinutes: estimatedMinutes || 0,
            status: 'pending',
            branch: branch || req.user.branch || 'Gaurabagh',

            // Optional “form” metadata for overall tracking
            taskFormName: taskFormName || '',
            taskFormType: taskFormType || 'other',
            taskFormAttachments: []
        };

        // Optional form uploads via Cloudinary middleware
        const uploadedFormFiles = req.uploadedFiles || [];
        if (uploadedFormFiles.length > 0) {
            taskData.taskFormAttachments = uploadedFormFiles.map(f => ({
                filename: f.filename,
                fileUrl: f.fileUrl,        // Cloudinary CDN URL - permanent
                publicId: f.publicId,      // For future deletion
                fileType: f.mimeType,
                fileSize: f.fileSize
            }));
        }
        
        let isTeamTaskBool = false;
        if (typeof isTeamTask === 'string') {
            const trimmed = isTeamTask.trim().toLowerCase();
            if (trimmed === 'true') {
                isTeamTaskBool = true;
            } else if (trimmed === 'false') {
                isTeamTaskBool = false;
            } else {
                try {
                    isTeamTaskBool = Boolean(JSON.parse(trimmed));
                } catch {
                    isTeamTaskBool = false;
                }
            }
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
            } else if (typeof assignedTeam === 'string') {
                try {
                    const parsed = JSON.parse(assignedTeam);
                    if (Array.isArray(parsed)) {
                        assignedTeamArr = parsed;
                    } else {
                        assignedTeamArr = [assignedTeam];
                    }
                } catch {
                    assignedTeamArr = assignedTeam.split(',').map(x => x.trim()).filter(Boolean);
                }
            } else {
                assignedTeamArr = [assignedTeam];
            }
        }

        const collaboratingDeptsArr = parseMaybeJsonArray(collaboratingDepartments) || collaboratingDepartments;

        if (isTeamTaskBool && assignedTeamArr && assignedTeamArr.length > 0) {
            taskData.isTeamTask = true;
            taskData.assignedTeam = assignedTeamArr;
            taskData.individualProgress = assignedTeamArr.map(userId => ({
                userId,
                status: 'pending'
            }));
        } else {
            taskData.assignedTo = assignedTo;
        }
        
        if (collaboratingDeptsArr && collaboratingDeptsArr.length > 0) {
            taskData.collaboratingDepartments = collaboratingDeptsArr;
        }
        
        const task = await Task.create(taskData);

        // Assign reviewers (for notification + access control)
        // - If creator is department-head/branch-head, they are the reviewer for their stage.
        // - Otherwise auto-pick by branch/department.
        try {
            const creatorRole = req.user.role;
            const reviewerUpdates = {};

            if (creatorRole === 'department-head') {
                reviewerUpdates.departmentManager = req.user._id;
            } else {
                const deptHead = await User.findOne({
                    role: 'department-head',
                    department: task.department,
                    branch: task.branch
                }).select('_id');
                if (deptHead) reviewerUpdates.departmentManager = deptHead._id;
            }

            if (creatorRole === 'branch-head') {
                reviewerUpdates.branchHead = req.user._id;
            } else {
                const branchHead = await User.findOne({
                    role: 'branch-head',
                    branch: task.branch
                }).select('_id');
                if (branchHead) reviewerUpdates.branchHead = branchHead._id;
            }

            if (Object.keys(reviewerUpdates).length > 0) {
                await Task.findByIdAndUpdate(task._id, reviewerUpdates);
            }
        } catch (e) {
            // reviewer assignment is best-effort; task creation should not fail
            console.warn('Reviewer auto-assign failed:', e?.message || e);
        }
        
        // Send notifications
        if (taskData.isTeamTask && assignedTeamArr && assignedTeamArr.length > 0) {
            await createBulkNotifications(
                assignedTeamArr,
                'New Team Task Assigned',
                `You are assigned to team task: "${title}"`,
                'task_assigned',
                task._id
            );
            // Send email notification to each team member
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
                    console.error(`Failed to send task assignment email to team member ${memberId}:`, emailErr.message);
                }
            }
        } else {
            await createNotification(
                assignedTo,
                'New Task Assigned',
                `You have been assigned: "${title}"`,
                'task_assigned',
                task._id
            );
            // Send Email to the assignee
            const assignee = await User.findById(assignedTo).select('email name');
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
        }
        
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo assignedBy assignedTeam', 'name email department role')
            .populate('individualProgress.userId', 'name email');
        
        res.status(201).json({ success: true, data: populatedTask });
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// ============ GET TASKS ============
export const getTasks = async (req, res) => {
    try {
        const { role, _id } = req.user;
        const { page = 1, limit = 50, search, status, priority, startDate, endDate, department, branch, nextCursor } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Base query from auth middleware
        let query = { ...(req.taskFilter || {}) };

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

        // Additional filter drills for management
        if (department && department !== 'all' && ['admin', 'branch-head', 'hr', 'it'].includes(role)) {
            query.department = department;
        }
        if (branch && branch !== 'all' && role === 'admin') {
            query.branch = branch;
        }

        if (req.query.assignedTo) {
            const assignedFilter = [
                { assignedTo: req.query.assignedTo },
                { assignedTeam: req.query.assignedTo }
            ];
            query.$or = query.$or ? [...query.$or, ...assignedFilter] : assignedFilter;
        }
        if (status && status !== 'all') query.status = status;
        if (priority && priority !== 'all') query.priority = priority;
        
        if (search) {
            query.$and = query.$and || [];
            if (search.trim().length >= 3) {
                // Highly optimized MongoDB text search index lookup
                query.$and.push({ $text: { $search: search } });
            } else {
                // Fallback for short terms to preserve partial matching
                query.$and.push({
                    $or: [
                        { title: { $regex: search, $options: 'i' } },
                        { description: { $regex: search, $options: 'i' } }
                    ]
                });
            }
        }

        // Robust Date Filtering (Supports named filters or custom ranges)
        const timeFilter = req.query.timeFilter;
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
            query.createdAt = query.createdAt || {};
            if (startDate && !isNaN(new Date(startDate))) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate && !isNaN(new Date(endDate))) {
                const d = new Date(endDate);
                d.setHours(23, 59, 59, 999);
                query.createdAt.$lte = d;
            }
        }
        
        let tasksQuery = Task.find(query).sort({ createdAt: -1, _id: -1 });

        if (!nextCursor) {
            tasksQuery = tasksQuery.skip(skip);
        }

        const limitVal = parseInt(limit);
        const tasks = await tasksQuery
            .limit(limitVal + 1)
            .populate('assignedTo assignedBy assignedTeam', 'name email department role branch avatar')
            .lean();

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
                page: nextCursor ? null : parseInt(page),
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
        const taskId = req.task?._id || req.params.id;
        const task = await Task.findById(taskId)
            .populate('assignedTo assignedBy assignedTeam', 'name email department role')
            .populate('individualProgress.userId', 'name email')
            .lean();
        
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
        const task = await Task.findById(req.params.id);
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        
        const { title, description, department, assignedTo, dueDate, 
                priority, estimatedHours, estimatedMinutes, branch } = req.body;

        const canEditAll = ['admin', 'it', 'department-head', 'branch-head', 'hr'].includes(req.user.role);

        if (canEditAll) {
            if (title) task.title = title;
            if (description !== undefined) task.description = description;
            if (department) task.department = department;
            if (assignedTo) task.assignedTo = assignedTo;
            if (dueDate) task.dueDate = dueDate;
            if (priority) task.priority = priority;
            if (branch) task.branch = branch;
            if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
            if (estimatedMinutes !== undefined) task.estimatedMinutes = estimatedMinutes;
        } else {
            // Employees are not allowed to change task metadata.
            // (Prevents accidental/intentional workflow breakage)
            if (description !== undefined) task.description = description;
        }
        
        await task.save();
        
        const updatedTask = await Task.findById(task._id)
            .populate('assignedTo assignedBy assignedTeam', 'name email department');
        
        res.json({ success: true, data: updatedTask });
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ============ DELETE TASK ============
export const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Only Admin or the user who created the task can delete it
        if (req.user.role !== 'admin' && task.assignedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this task. Only Admins or the task creator can delete it.' });
        }

        // Cleanup form attachments (both Cloudinary CDN and local fallback)
        if (task.taskFormAttachments && task.taskFormAttachments.length > 0) {
            for (const att of task.taskFormAttachments) {
                try {
                    if (att.publicId) {
                        await deleteFromCloudinary(att.publicId);
                    }
                    const filePath = path.join(__dirname, '..', '..', att.fileUrl);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                } catch (e) {
                    console.error("Error deleting form attachment:", e);
                }
            }
        }

        // Cleanup attempt attachments (both Cloudinary CDN and local fallback)
        if (task.attempts && task.attempts.length > 0) {
            for (const attempt of task.attempts) {
                if (attempt.attachments && attempt.attachments.length > 0) {
                    for (const att of attempt.attachments) {
                        try {
                            if (att.publicId) {
                                await deleteFromCloudinary(att.publicId);
                            }
                            const filePath = path.join(__dirname, '..', '..', att.fileUrl);
                            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                        } catch (e) {
                            console.error("Error deleting attempt attachment:", e);
                        }
                    }
                }
            }
        }

        await task.deleteOne();
        res.json({ success: true, message: 'Task and associated files deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ START TASK - FIXED ============
export const startTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        
        const userId = req.user._id.toString();
        const isAssigned = task.assignedTo?.toString() === userId;
        const isTeamMember = task.assignedTeam?.some(m => m.toString() === userId);
        const isAdmin = req.user.role === 'admin';
        const isDeptHead = req.user.role === 'department-head' && task.department === req.user.department && task.branch === req.user.branch;
        const isBranchHead = req.user.role === 'branch-head' && task.branch === req.user.branch;

        const isDeptReviewer = isDeptHead && (!task.departmentManager || task.departmentManager.toString() === req.user._id.toString());
        const isBranchReviewer = isBranchHead && (!task.branchHead || task.branchHead.toString() === req.user._id.toString());
        
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

        // Reset review flow on new start (employee rework after rejection)
        if (!task.workflow) task.workflow = {};
        if (!task.workflow.departmentReview) task.workflow.departmentReview = {};
        if (!task.workflow.branchReview) task.workflow.branchReview = {};
        task.workflow.departmentReview.status = 'pending';
        task.workflow.departmentReview.reviewedAt = null;
        task.workflow.departmentReview.reviewedBy = null;
        task.workflow.departmentReview.comments = '';
        task.workflow.branchReview.status = 'not-started';
        task.workflow.branchReview.reviewedAt = null;
        task.workflow.branchReview.reviewedBy = null;
        task.workflow.branchReview.comments = '';
        
        if (!task.attempts) task.attempts = [];
        task.attempts.push({
            attemptNumber: task.currentAttempt,
            startedAt: new Date(),
            status: 'in-progress'
        });
        
        await task.save();
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });

        // Notify the Assigner that the task has started
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
        
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo assignedBy assignedTeam', 'name email department');
        
        res.json({ success: true, data: populatedTask });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ SUBMIT TASK - FIXED ============
export const submitTaskWithTime = async (req, res) => {
    try {
        const { submissionNote, actualMinutes } = req.body;
        const task = await Task.findById(req.params.id);
        
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
        
        // Handle team task submission
        if (task.isTeamTask && isTeamMember) {
            const progress = task.individualProgress.find(
                p => p.userId.toString() === userId
            );
            if (progress) {
                progress.status = 'submitted';
                progress.submittedAt = new Date();
                progress.submissionNote = submissionNote;

                // Store attachments from Cloudinary middleware
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
            
            const populatedTask = await Task.findById(task._id)
                .populate('assignedTo assignedBy assignedTeam', 'name email')
                .populate('individualProgress.userId', 'name email');
            
            return res.json({ 
                success: true, 
                data: populatedTask,
                message: 'Your part submitted! Waiting for team members.' 
            });
        }
        
        // Individual task submission
        if (task.status !== 'in-progress') {
            return res.status(400).json({ 
                success: false, 
                message: 'Task must be in progress to submit' 
            });
        }
        
        const now = new Date();
        let timeSpent = actualMinutes;
        
        if (!timeSpent && task.startedAt) {
            timeSpent = Math.floor((now - task.startedAt) / (1000 * 60));
        }
        
        if (task.attempts.length > 0) {
            const currentAttempt = task.attempts[task.attempts.length - 1];
            currentAttempt.submittedAt = now;
            currentAttempt.timeSpent = timeSpent;
            currentAttempt.submissionNote = submissionNote;
            const uploaded = (req.uploadedFiles || []).map(f => ({
                filename: f.filename,
                fileUrl: f.fileUrl,
                publicId: f.publicId,
                fileType: f.mimeType,
                fileSize: f.fileSize
            }));
            if (uploaded.length > 0) currentAttempt.submissionAttachments = uploaded;
            currentAttempt.status = 'submitted';
        }
        
        task.submittedAt = now;
        task.submissionNote = submissionNote;
        task.totalTimeSpent = (task.totalTimeSpent || 0) + (timeSpent || 0);
        task.status = 'submitted';

        // Reset the review pipeline whenever employee submits for review
        if (!task.workflow) task.workflow = {};
        if (!task.workflow.departmentReview) task.workflow.departmentReview = {};
        if (!task.workflow.branchReview) task.workflow.branchReview = {};
        task.workflow.departmentReview.status = 'pending';
        task.workflow.departmentReview.reviewedAt = null;
        task.workflow.departmentReview.reviewedBy = null;
        task.workflow.departmentReview.comments = '';
        task.workflow.branchReview.status = 'not-started';
        task.workflow.branchReview.reviewedAt = null;
        task.workflow.branchReview.reviewedBy = null;
        task.workflow.branchReview.comments = '';
        
        await task.save();
        
        // Determine the appropriate reviewer based on 1-step hierarchy
        let reviewerId = null;
        if (req.user.role === 'employee' || req.user.role === 'graphic' || req.user.role === 'hr' || req.user.role === 'it') {
            reviewerId = task.departmentManager
                ? task.departmentManager
                : (await User.findOne({
                    role: 'department-head',
                    department: task.department,
                    branch: task.branch
                }).select('_id'))?._id;
        } else if (req.user.role === 'department-head') {
            reviewerId = task.branchHead
                ? task.branchHead
                : (await User.findOne({
                    role: 'branch-head',
                    branch: task.branch
                }).select('_id'))?._id;
        } else if (task.assignedBy && task.assignedBy.toString() !== req.user._id.toString()) {
            // Fallback to assigner
            reviewerId = task.assignedBy;
        }

        const uploadedFiles = task.attempts[task.attempts.length - 1]?.submissionAttachments || [];
        
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
                    const attachmentNames = uploadedFiles.map(f => f.filename).join(', ');
                    await sendEmailNotification(
                        reviewer.email,
                        'TASK_SUBMITTED',
                        {
                            employeeName: reviewer.name,
                            taskTitle: task.title,
                            dueDate: task.dueDate,
                            priority: task.priority,
                            department: task.department,
                            feedback: `${req.user.name} has submitted this task for your review.\n\nSubmission Note: ${submissionNote}${attachmentNames ? `\n\nAttachments: ${attachmentNames}` : ''}`,
                            taskId: task._id,
                            senderId: req.user._id
                        },
                        uploadedFiles
                    );
                }
            }
        }

        // Send submission notification and email to the original assigner as well
        if (task.assignedBy && task.assignedBy.toString() !== reviewerId?.toString() && task.assignedBy.toString() !== req.user._id.toString()) {
            try {
                const assigner = await User.findById(task.assignedBy).select('email name');
                if (assigner) {
                    await createNotification(
                        assigner._id,
                        'Task Submitted for Review',
                        `${req.user.name} submitted "${task.title}" for review`,
                        'task_submitted',
                        task._id
                    );

                    if (assigner.email) {
                        const attachmentNames = uploadedFiles.map(f => f.filename).join(', ');
                        await sendEmailNotification(
                            assigner.email,
                            'TASK_SUBMITTED',
                            {
                                employeeName: assigner.name,
                                taskTitle: task.title,
                                dueDate: task.dueDate,
                                priority: task.priority,
                                department: task.department,
                                feedback: `${req.user.name} has submitted this task for review.\n\nSubmission Note: ${submissionNote}${attachmentNames ? `\n\nAttachments: ${attachmentNames}` : ''}`,
                                taskId: task._id,
                                senderId: req.user._id
                            },
                            uploadedFiles
                        );
                    }
                }
            } catch (assignerErr) {
                console.error('Failed to notify task assigner of submission:', assignerErr.message);
            }
        }

            // CC to department/branch configured email in Settings
            try {
                const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' }).lean();
                const deptEmail = settings?.departmentEmails?.[task.department];
                const branchEmail = settings?.branchEmails?.[task.branch];

                if (deptEmail) {
                    await sendEmailNotification(deptEmail, 'TASK_SUBMITTED', {
                        employeeName: `${task.department} Dept`,
                        taskTitle: task.title,
                        dueDate: task.dueDate,
                        priority: task.priority,
                        department: task.department,
                        feedback: `[CC] ${req.user.name} submitted "${task.title}" for review.`,
                        taskId: task._id
                    });
                }
                if (branchEmail && branchEmail !== deptEmail) {
                    await sendEmailNotification(branchEmail, 'TASK_SUBMITTED', {
                        employeeName: `${task.branch} Branch`,
                        taskTitle: task.title,
                        dueDate: task.dueDate,
                        priority: task.priority,
                        department: task.department,
                        feedback: `[CC] ${req.user.name} submitted "${task.title}" for review.`,
                        taskId: task._id
                    });
                }
            } catch (e) {
                console.warn('CC email error (non-fatal):', e.message);
            }

        // ── Confirmation to the submitting employee ───────────────────
        await createNotification(
            req.user._id,
            'Task Submitted Successfully',
            `Your task "${task.title}" has been submitted for review.`,
            'task_updated',
            task._id
        );
        if (req.user.email) {
            const feedback = `Your task has been submitted successfully for review. We will notify you once it is reviewed.${uploadedFiles.length > 0 ? `\n\nYou attached ${uploadedFiles.length} file(s): ${uploadedFiles.map(f => f.filename).join(', ')}` : ''}`;
            await sendEmailNotification(
                req.user.email,
                'TASK_UPDATED',
                {
                    employeeName: req.user.name,
                    taskTitle: task.title,
                    feedback,
                    taskId: task._id,
                    senderId: req.user._id
                }
            );
            
            // Add to activity log for transparency (visible to employee/reviewer)
            task.activityLog.push({
                action: 'status_changed',
                userId: req.user._id,
                userName: 'System',
                details: `Confirmation email sent to ${req.user.email}.`
            });
            await task.save();
        }
        
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo assignedBy assignedTeam', 'name email department');
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
        
        res.json({ 
            success: true, 
            data: populatedTask,
            message: `Task submitted! Time spent: ${timeSpent || '?'} minutes` 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ REVIEW TASK ============
export const reviewTask = async (req, res) => {
    try {
        const { status, adminComments, reviewStage } = req.body;
        const task = await Task.findById(req.params.id);
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        
        const isAdmin = req.user.role === 'admin';
        const isDeptHead = req.user.role === 'department-head' && task.department === req.user.department && task.branch === req.user.branch;
        const isBranchHead = req.user.role === 'branch-head' && task.branch === req.user.branch;

        // Reviewer identity checks:
        // - If task has explicit reviewer assigned, only that reviewer (or admin) can act.
        // - Otherwise any dept/branch head within matching scope can act (backward compatibility).
        const isDeptReviewer =
            isDeptHead &&
            (!task.departmentManager || task.departmentManager.toString() === req.user._id.toString());
        const isBranchReviewer =
            isBranchHead &&
            (!task.branchHead || task.branchHead.toString() === req.user._id.toString());
        
        const isAssigner = task.assignedBy?.toString() === req.user._id.toString();

        if (!isAdmin && !isDeptReviewer && !isBranchReviewer && !isAssigner) {
            return res.status(403).json({ 
                success: false, 
                message: 'Only Department Head, Branch Head, Assigner, or Admin can review tasks' 
            });
        }
        
        if (task.status !== 'submitted') {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot review task in "${task.status}" status. Task must be submitted.` 
            });
        }

        // --- Multi-Step Review Implementation ---
        const reviewData = {
            status: status,
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
            comments: adminComments || (status === 'approved' ? 'Approved' : 'Rejected')
        };


        // 1. If reviewer is the ASSIGNER, they can finalize the review immediately
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
            }
        } 
        // 2. Standard Workflow: Dept Head -> Branch Head
        else if (isDeptReviewer && task.workflow.departmentReview.status === 'pending') {
            if (status === 'approved') {
                task.workflow.departmentReview = { ...reviewData, status: 'approved' };
                task.workflow.branchReview.status = 'pending'; // Move to next stage
                // Task stays in 'submitted' status but progress is tracked
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
                message: 'Invalid review stage or unauthorized for current stage.' 
            });
        }

        task.adminComments = adminComments || (status === 'approved' ? 'Task approved.' : 'Task needs revision.');
        if (task.attempts.length > 0) {
            const lastAttempt = task.attempts[task.attempts.length - 1];
            lastAttempt.status = status;
            lastAttempt.adminFeedback = adminComments;
        }

        await task.save();

        // ── Email routing based on review stage ──────────────────────────────
        const assignee = await User.findById(task.assignedTo).select('email name');

        if (isDeptReviewer && status === 'approved') {
            // Dept head approved → notify Branch Head to do second review
            const branchHead = task.branchHead
                ? await User.findById(task.branchHead).select('email name')
                : await User.findOne({ role: 'branch-head', branch: task.branch }).select('email name');

            if (branchHead) {
                await createNotification(
                    branchHead._id,
                    'Task Ready for Branch Review',
                    `Dept Head approved "${task.title}". Please do final review.`,
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
                        feedback: `Department Head (${req.user.name}) approved this task. It now requires your final branch review.`,
                        taskId: task._id,
                        senderId: req.user._id
                    });
                }
            }
        } else {
            // Approved fully (by admin/branch head) OR Rejected at any stage → notify employee
            const notifTitle = status === 'approved' ? '✅ Task Approved!' : '❌ Task Needs Rework';
            const notifMsg = status === 'approved'
                ? `Your task "${task.title}" has been fully approved. Great work! 🎉`
                : `Your task "${task.title}" was rejected. Reason: ${adminComments || 'Please check feedback'}`;

            if (task.assignedTo) {
                await createNotification(task.assignedTo, notifTitle, notifMsg,
                    status === 'approved' ? 'task_approved' : 'task_rejected', task._id);
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

        const populatedTask = await Task.findById(task._id).populate('assignedTo assignedBy assignedTeam', 'name email department');
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
        return res.json({
            success: true,
            data: populatedTask,
            message: status === 'approved' ? 'Task approved successfully!' : 'Task rejected. Employee notified.'
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
        const task = await Task.findById(req.params.id);
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        
        if (!task.comments) task.comments = [];
        task.comments.push({
            userId: req.user._id,
            userName: req.user.name,
            userRole: req.user.role,
            message: comment,
            createdAt: new Date()
        });
        
        await task.save();
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });

        // Notify Assigner / Reviewer that an update has been posted
        if (task.assignedBy && task.assignedBy.toString() !== req.user._id.toString()) {
            const assigner = await User.findById(task.assignedBy).select('email name');
            if (assigner) {
                await createNotification(
                    assigner._id,
                    'Task Update',
                    `${req.user.name} added an update to "${task.title}": ${comment.substring(0, 50)}...`,
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
                            feedback: `${req.user.name} posted an update: "${comment}"`,
                            taskId: task._id,
                            senderId: req.user._id
                        }
                    );
                }
            }
        }
        
        res.json({ success: true, data: task, message: 'Comment added successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ GET DEPARTMENT TASKS ============
export const getDepartmentTasks = async (req, res) => {
    try {
        const { department } = req.params;
        const tasks = await Task.find({ department })
            .populate('assignedTo assignedBy assignedTeam', 'name email')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ GET TEAM TASKS ============
export const getTeamTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ 
            isTeamTask: true,
            $or: [
                { assignedTeam: req.user._id },
                { assignedBy: req.user._id }
            ]
        })
        .populate('assignedTo assignedBy assignedTeam', 'name email')
        .sort({ createdAt: -1 })
        .lean();
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ UPDATE TEAM PROGRESS ============
export const updateTeamProgress = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status, submissionNote } = req.body;
        
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        
        const progress = task.individualProgress?.find(
            p => p.userId.toString() === req.user._id.toString()
        );
        
        if (progress) {
            progress.status = status;
            if (status === 'submitted') {
                progress.submittedAt = new Date();
                progress.submissionNote = submissionNote;
            }
            await task.save();
        }
        
        res.json({ success: true, data: task });
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDashboardStats = async (req, res) => {
    try {
        const { role } = req.user;
        const { department, branch, startDate, endDate } = req.query;
        
        // Base query from middleware
        let query = req.taskFilter ? { ...req.taskFilter } : {};

        // Managers can refine their view
        if (department && department !== 'all') {
            query.department = department;
        }
        if (branch && branch !== 'all') {
            query.branch = branch;
        }
        
        // Date Filtering (Named filters like daily, weekly, monthly or custom dates)
        const timeFilter = req.query.timeFilter;
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

        const recentTasks = [];

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
                recentTasks
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ success: false, message: error.message || 'Error loading stats' });
    }
};

// ============ REASSIGN TASK ============
export const reassignTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { assignedTo, assignedTeam, isTeamTask, reason } = req.body;
        
        const task = await Task.findById(id);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        const oldAssignee = task.assignedTo;
        
        task.isTeamTask = !!isTeamTask;
        if (isTeamTask) {
            task.assignedTeam = assignedTeam;
            task.assignedTo = null;
        } else {
            task.assignedTo = assignedTo;
            task.assignedTeam = [];
        }

        // Status reset if it was completed/submitted
        if (['completed', 'approved', 'submitted'].includes(task.status)) {
            task.status = 'pending';
        }

        // Log the reassignment
        if (!task.comments) task.comments = [];
        task.comments.push({
            user: req.user._id,
            text: `🔄 Task reassigned. Reason: ${reason || 'Not specified'}`,
            createdAt: new Date()
        });

        await task.save();
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });

        // Notify NEW assignee
        if (isTeamTask) {
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
                    console.error(`Failed to send task reassignment email to team member ${memberId}:`, emailErr.message);
                }
            }
        } else {
            await createNotification(
                assignedTo,
                'Task Reassigned to You',
                `You have been assigned to: "${task.title}"`,
                'task_assigned',
                task._id
            );
            
            const assignee = await User.findById(assignedTo).select('email name');
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
        }

        res.json({ success: true, message: 'Task reassigned successfully', data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ GET EMPLOYEE SUMMARY ============
export const getEmployeeSummary = async (req, res) => {
    try {
        let match = {};
        const { role, department, branch } = req.user;
        
        if (role === 'admin' || role === 'hr') {
            match = {};
        } else if (role === 'department-head') {
            match = { department, branch };
        } else if (role === 'branch-head') {
            match = { branch };
        } else {
            return res.json({ success: true, data: [] });
        }
        
        // Find relevant employees
        const employees = await User.find({ 
            ...match, 
            role: { $in: ['employee', 'hr', 'it', 'graphic', 'branch-head', 'department-head'] } // include heads in HR/Admin view if needed, or keep to workers. Wait, we should probably let them see all non-admin. Let's just exclude admin.
        }).select('name department branch role avatar employeeId').lean();

        // Use aggregation to count tasks for these employees
        const employeeIds = employees.map(e => e._id);
        const now = new Date();

        const taskStats = await Task.aggregate([
            {
                $match: {
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
                // We need to handle team tasks by "unwinding" if necessary.
                // Using $setUnion prevents duplicate counts if a user is in both assignedTo and assignedTeam.
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
                _id: emp._id, // Add _id for key mapping in React
                id: emp._id,
                name: emp.name,
                department: emp.department || emp.role,
                branch: emp.branch,
                avatar: emp.avatar,
                role: emp.role,
                employeeId: emp.employeeId,
                totalTasks: stats.total, // map to Dashboard variable names
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
        const task = await Task.findById(req.params.id);
        
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

        // This “generic” status route is intentionally restricted.
        // Approved/Rejected should only come from the review endpoints.
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
            task.submissionNote = submissionNote;
            task.submittedAt = new Date();
        } else if (status === 'comment' && submissionNote) {
            if (!task.comments) task.comments = [];
            task.comments.push({
                userId: req.user._id,
                userName: req.user.name,
                userRole: req.user.role,
                message: submissionNote,
                createdAt: new Date()
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid status update. Allowed: start, submit, comment.'
            });
        }
        
        await task.save();
        eventBus.emit('data_change', { type: EVENTS.TASK_UPDATED });
        
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo assignedBy assignedTeam', 'name email department');
        
        res.json({ success: true, data: populatedTask });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ GET TIME REPORT ============
export const getTimeReport = async (req, res) => {
    try {
        const { startDate, endDate, department } = req.query;
        let query = { ...(req.taskFilter || {}) };
        
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
        
        const tasks = await Task.find(query)
            .populate('assignedTo assignedBy', 'name email department')
            .sort({ createdAt: -1 })
            .lean();
        
        res.json({ success: true, data: tasks });
    } catch (error) {
        console.error('Time report error:', error);
        res.status(500).json({ success: false, message: 'Error generating time report' });
    }
};

// End of file