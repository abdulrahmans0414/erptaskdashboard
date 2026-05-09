import Task from '../models/Task.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

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

        // Optional form uploads (multipart)
        const uploadedFormFiles = req.files?.taskFormFiles || [];
        if (uploadedFormFiles.length > 0) {
            taskData.taskFormAttachments = uploadedFormFiles.map(f => ({
                filename: f.originalname,
                fileUrl: `/uploads/tasks/forms/${f.filename}`,
                fileType: f.mimetype,
                fileSize: f.size
            }));
        }
        
        const assignedTeamArr = parseMaybeJsonArray(assignedTeam) || assignedTeam;
        const collaboratingDeptsArr = parseMaybeJsonArray(collaboratingDepartments) || collaboratingDepartments;

        if ((isTeamTask === true || isTeamTask === 'true') && assignedTeamArr && assignedTeamArr.length > 0) {
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
        if (isTeamTask && assignedTeam) {
            await createBulkNotifications(
                assignedTeam,
                'New Team Task Assigned',
                `You are assigned to team task: "${title}"`,
                'task_assigned',
                task._id
            );
        } else {
            await createNotification(
                assignedTo,
                'New Task Assigned',
                `You have been assigned: "${title}"`,
                'task_assigned',
                task._id
            );
        }
        
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo assignedBy assignedTeam', 'name email department role')
            .populate('individualProgress.userId', 'name email');
        
        res.status(201).json({ success: true, data: populatedTask });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// ============ GET TASKS ============
export const getTasks = async (req, res) => {
    try {
        let query = {};
        const { role, _id, department, branch } = req.user;
        
        if (role === 'admin') {
            query = {};
        } else if (role === 'department-head') {
            query = { department, branch };
        } else if (role === 'hr') {
            query = { department: 'HR', branch };
        } else if (role === 'branch-head') {
            query = { branch };
        } else {
            query = {
                $or: [
                    { assignedTo: _id },
                    { assignedTeam: _id }
                ]
            };
        }
        
        const tasks = await Task.find(query)
            .populate('assignedTo assignedBy assignedTeam', 'name email department role branch')
            .populate('individualProgress.userId', 'name email')
            .sort({ createdAt: -1 });
        
        res.json({ success: true, data: tasks });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ GET TASK BY ID ============
export const getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo assignedBy assignedTeam', 'name email department role')
            .populate('individualProgress.userId', 'name email');
        
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
        await task.deleteOne();
        res.json({ success: true, message: 'Task deleted successfully' });
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
        
        if (!isAssigned && !isTeamMember && !isAdmin && !isDeptHead && !isBranchHead) {
            return res.status(403).json({ 
                success: false, 
                message: 'You are not authorized to start this task' 
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
                message: 'Only assigned employee can submit this task' 
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

                // Store attachments as a comment on the member's progress (keeps schema compatible)
                const uploaded = (req.files || []).map(f => ({
                    filename: f.originalname,
                    fileUrl: `/uploads/tasks/submissions/${f.filename}`,
                    fileType: f.mimetype,
                    fileSize: f.size
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
            const uploaded = (req.files || []).map(f => ({
                filename: f.originalname,
                fileUrl: `/uploads/tasks/submissions/${f.filename}`,
                fileType: f.mimetype,
                fileSize: f.size
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
        
        // Notify department reviewer (department head)
        const deptReviewerId = task.departmentManager
            ? task.departmentManager
            : (await User.findOne({
                role: 'department-head',
                department: task.department,
                branch: task.branch
            }).select('_id'))?._id;

        if (deptReviewerId) {
            await createNotification(
                deptReviewerId,
                'Task Submitted for Review',
                `${req.user.name} submitted "${task.title}" for review`,
                'task_submitted',
                task._id
            );
        }
        
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo assignedBy assignedTeam', 'name email department');
        
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
        
        if (!isAdmin && !isDeptReviewer && !isBranchReviewer) {
            return res.status(403).json({ 
                success: false, 
                message: 'Only Department Head, Branch Head, or Admin can review tasks' 
            });
        }
        
        if (task.status !== 'submitted') {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot review task in "${task.status}" status. Task must be submitted.` 
            });
        }

        const stage = reviewStage || (
            req.user.role === 'department-head' ? 'department' :
            req.user.role === 'branch-head' ? 'branch' :
            'department'
        );

        const hasWorkflow = Boolean(task.workflow?.departmentReview && task.workflow?.branchReview);

        if (!task.workflow) task.workflow = {};
        if (!task.workflow.departmentReview) task.workflow.departmentReview = {};
        if (!task.workflow.branchReview) task.workflow.branchReview = {};

        // Default statuses (also used for backward compatibility when workflow is missing).
        const deptStatus = task.workflow.departmentReview.status || 'pending';
        const branchStatus = task.workflow.branchReview.status || 'pending';

        if (stage === 'department') {
            if (!isAdmin && !isDeptReviewer) {
                return res.status(403).json({
                    success: false,
                    message: 'Only Department Head (or Admin) can perform Department Review'
                });
            }
            if (deptStatus !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `Department review is not pending (current: ${deptStatus})`
                });
            }

            if (status === 'approved') {
                task.workflow.departmentReview.status = 'approved';
                task.workflow.departmentReview.reviewedAt = new Date();
                task.workflow.departmentReview.reviewedBy = req.user._id;
                task.workflow.departmentReview.comments = adminComments || 'Department approved.';

                // Next stage for branch head
                task.workflow.branchReview.status = 'pending';
                task.workflow.branchReview.reviewedAt = null;
                task.workflow.branchReview.reviewedBy = null;
                task.workflow.branchReview.comments = '';

                await task.save();

                // Notify branch head for this branch
                const branchHead = await User.findOne({
                    role: 'branch-head',
                    branch: task.branch
                });
                if (branchHead) {
                    await createNotification(
                        branchHead._id,
                        '✅ Dept Approved: Branch Review Pending',
                        `Department approved "${task.title}". Branch review is now pending.`,
                        'task_branch_review_pending',
                        task._id
                    );
                }

                const populatedTask = await Task.findById(task._id)
                    .populate('assignedTo assignedBy assignedTeam', 'name email department');

                return res.json({
                    success: true,
                    data: populatedTask,
                    message: 'Department approved. Branch review is now pending.'
                });
            }

            if (status === 'rejected') {
                task.workflow.departmentReview.status = 'rejected';
                task.workflow.departmentReview.reviewedAt = new Date();
                task.workflow.departmentReview.reviewedBy = req.user._id;
                task.workflow.departmentReview.comments = adminComments || 'Department rejected. Please revise.';

                // When department rejects, employee must resubmit.
                task.status = 'rejected';
                task.adminComments = adminComments || 'Task needs revision.';

                if (task.attempts.length > 0) {
                    task.attempts[task.attempts.length - 1].status = 'rejected';
                    task.attempts[task.attempts.length - 1].adminFeedback = adminComments;
                }

                // Reset branch stage for next submission
                task.workflow.branchReview.status = 'not-started';
                task.workflow.branchReview.reviewedAt = null;
                task.workflow.branchReview.reviewedBy = null;
                task.workflow.branchReview.comments = '';

                await task.save();

                await createNotification(
                    task.assignedTo,
                    '❌ Dept Review Rejected',
                    `Your task "${task.title}" was rejected by Department Head. Reason: ${adminComments || 'Please check feedback'}`,
                    'task_rejected',
                    task._id
                );

                const populatedTask = await Task.findById(task._id)
                    .populate('assignedTo assignedBy assignedTeam', 'name email department');

                return res.json({
                    success: true,
                    data: populatedTask,
                    message: 'Department rejected. Employee notified.'
                });
            }
        }

        if (stage === 'branch') {
            if (!isAdmin && !isBranchReviewer) {
                return res.status(403).json({
                    success: false,
                    message: 'Only Branch Head (or Admin) can perform Branch Review'
                });
            }

            if (hasWorkflow && deptStatus !== 'approved') {
                return res.status(400).json({
                    success: false,
                    message: 'Branch review cannot start until Department review is approved.'
                });
            }

            if (branchStatus !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `Branch review is not pending (current: ${branchStatus})`
                });
            }

            if (status === 'approved') {
                task.workflow.branchReview.status = 'approved';
                task.workflow.branchReview.reviewedAt = new Date();
                task.workflow.branchReview.reviewedBy = req.user._id;
                task.workflow.branchReview.comments = adminComments || 'Branch approved.';

                // Final approval
                task.status = 'approved';
                task.completedAt = new Date();
                task.approvedAt = new Date();
                task.approvedBy = req.user._id;
                task.adminComments = adminComments || 'Task approved! Good work.';

                if (task.attempts.length > 0) {
                    task.attempts[task.attempts.length - 1].status = 'approved';
                    task.attempts[task.attempts.length - 1].adminFeedback = adminComments;
                }

                await task.save();

                await createNotification(
                    task.assignedTo,
                    '✅ Task Approved',
                    `Your task "${task.title}" has been approved by ${req.user.name}`,
                    'task_approved',
                    task._id
                );

                const populatedTask = await Task.findById(task._id)
                    .populate('assignedTo assignedBy assignedTeam', 'name email department');

                return res.json({
                    success: true,
                    data: populatedTask,
                    message: 'Task approved successfully!'
                });
            }

            if (status === 'rejected') {
                task.workflow.branchReview.status = 'rejected';
                task.workflow.branchReview.reviewedAt = new Date();
                task.workflow.branchReview.reviewedBy = req.user._id;
                task.workflow.branchReview.comments = adminComments || 'Branch rejected. Please revise.';

                task.status = 'rejected';
                task.adminComments = adminComments || 'Task needs revision.';

                if (task.attempts.length > 0) {
                    task.attempts[task.attempts.length - 1].status = 'rejected';
                    task.attempts[task.attempts.length - 1].adminFeedback = adminComments;
                }

                // Reset department stage for next submission: department must re-review
                task.workflow.departmentReview.status = 'pending';
                task.workflow.departmentReview.reviewedAt = null;
                task.workflow.departmentReview.reviewedBy = null;
                task.workflow.departmentReview.comments = '';

                await task.save();

                await createNotification(
                    task.assignedTo,
                    '❌ Branch Review Rejected',
                    `Your task "${task.title}" was rejected by Branch Head. Reason: ${adminComments || 'Please check feedback'}`,
                    'task_rejected',
                    task._id
                );

                const populatedTask = await Task.findById(task._id)
                    .populate('assignedTo assignedBy assignedTeam', 'name email department');

                return res.json({
                    success: true,
                    data: populatedTask,
                    message: 'Branch rejected. Employee notified.'
                });
            }
        }

        return res.status(400).json({
            success: false,
            message: 'Invalid review stage or status. Use reviewStage ("department"|"branch") and status ("approved"|"rejected").'
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
            .sort({ createdAt: -1 });
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
        .sort({ createdAt: -1 });
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
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ GET DASHBOARD STATS ============
export const getDashboardStats = async (req, res) => {
    try {
        let query = {};
        const { role, _id, department, branch } = req.user;
        
        if (role === 'admin') {
            query = {};
        } else if (role === 'department-head') {
            query = { department, branch };
        } else if (role === 'branch-head') {
            query = { branch };
        } else if (role === 'hr') {
            query = { department: 'HR' };
        } else {
            query = { $or: [{ assignedTo: _id }, { assignedTeam: _id }] };
        }
        
        const tasks = await Task.find(query);
        const completedTasks = tasks.filter(t => t.status === 'approved' || t.status === 'completed');
        
        res.json({
            success: true,
            data: {
                summary: {
                    totalTasks: tasks.length,
                    completedTasks: completedTasks.length,
                    pendingTasks: tasks.filter(t => t.status === 'pending').length,
                    inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
                    submittedTasks: tasks.filter(t => t.status === 'submitted').length,
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ GET EMPLOYEE SUMMARY ============
export const getEmployeeSummary = async (req, res) => {
    try {
        let query = {};
        const { role, department, branch } = req.user;
        
        if (role === 'admin') {
            query = {};
        } else if (role === 'department-head') {
            query = { department, branch };
        } else if (role === 'branch-head') {
            query = { branch };
        } else {
            return res.json({ success: true, data: [] });
        }
        
        const employees = await User.find({ ...query, role: { $in: ['employee', 'hr', 'it', 'graphic'] } });
        const tasks = await Task.find(query);
        
        const summary = employees.map(emp => {
            const empTasks = tasks.filter(t => 
                t.assignedTo?.toString() === emp._id.toString() ||
                t.assignedTeam?.some(m => m.toString() === emp._id.toString())
            );
            return {
                id: emp._id,
                name: emp.name,
                department: emp.department || emp.role,
                branch: emp.branch,
                total: empTasks.length,
                pending: empTasks.filter(t => t.status === 'pending').length,
                inProgress: empTasks.filter(t => t.status === 'in-progress').length,
                submitted: empTasks.filter(t => t.status === 'submitted').length,
                completed: empTasks.filter(t => t.status === 'approved' || t.status === 'completed').length,
                overdue: empTasks.filter(t => 
                    t.status !== 'completed' && t.status !== 'approved' && 
                    new Date(t.dueDate) < new Date()
                ).length
            };
        });
        
        res.json({ success: true, data: summary });
    } catch (error) {
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
        let query = {};
        
        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (department && department !== 'all') {
            query.department = department;
        }
        
        const tasks = await Task.find(query)
            .populate('assignedTo assignedBy', 'name email department')
            .sort({ createdAt: -1 });
        
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};