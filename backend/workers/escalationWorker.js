import cron from 'node-cron';
import Task from '../models/Task.js';
import { sendEmailNotification } from '../utils/emailService.js';
import Settings from '../models/Settings.js';

/**
 * Initializes the escalation cron job.
 * Runs every hour between 7:00 AM and 9:00 AM.
 */
export const initEscalationWorker = () => {
    console.log('🕒 Escalation Worker initialized (Cron: 0 7-9 * * *)');
    
    cron.schedule('0 7-9 * * *', async () => {
        try {
            console.log('🚀 Running Task Escalation Check...');
            
            // We need to look for tasks that are:
            // 1. Pending or in-progress
            // 2. Overdue (dueDate < now)
            // 3. Not deleted
            const now = new Date();
            const oneDayInMs = 24 * 60 * 60 * 1000;
            
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const overdueTasks = await Task.find({
                status: { $in: ['pending', 'in-progress'] },
                dueDate: { $lt: now },
                isDeleted: { $ne: true },
                // Anti-spam: Only process if we haven't sent an escalation today
                $or: [
                    { lastEscalationSentAt: null },
                    { lastEscalationSentAt: { $lt: startOfDay } }
                ]
            })
            .populate('assignedTo', 'name email')
            .populate('departmentManager', 'name email')
            .populate('branchHead', 'name email');

            if (overdueTasks.length === 0) {
                console.log('✅ No actionable overdue tasks found for escalation.');
                return;
            }

            console.log(`⚠️ Found ${overdueTasks.length} overdue tasks to process.`);

            for (const task of overdueTasks) {
                const overdueTimeMs = now.getTime() - task.dueDate.getTime();
                const overdueDays = Math.floor(overdueTimeMs / oneDayInMs);

                // Need an assignee email to send anything
                if (!task.assignedTo || !task.assignedTo.email) continue;

                let ccEmails = [];

                // Multi-Level Escalation Matrix
                if (overdueDays >= 3) {
                    // Level 2: 3+ days overdue. CC Branch/Dept Heads
                    if (task.departmentManager && task.departmentManager.email) {
                        ccEmails.push(task.departmentManager.email);
                    }
                    if (task.branchHead && task.branchHead.email) {
                        ccEmails.push(task.branchHead.email);
                    }
                }

                const ccString = ccEmails.length > 0 ? ccEmails.join(',') : undefined;

                const subject = `URGENT: Task "${task.title}" is ${overdueDays} day(s) overdue`;
                const message = `
                    <h3>Task Escalation Notice</h3>
                    <p>Dear ${task.assignedTo.name},</p>
                    <p>This is an automated notification that the following task is currently overdue:</p>
                    <ul>
                        <li><strong>Title:</strong> ${task.title}</li>
                        <li><strong>Due Date:</strong> ${task.dueDate.toLocaleString()}</li>
                        <li><strong>Overdue By:</strong> ${overdueDays} day(s)</li>
                        <li><strong>Status:</strong> ${task.status}</li>
                    </ul>
                    <p>Please log in to the SPIS ERP Dashboard to update the status or submit your work immediately.</p>
                    ${overdueDays >= 3 ? '<p style="color:red;"><strong>Note: As this task is severely overdue, your Department and Branch Heads have been copied on this communication.</strong></p>' : ''}
                `;

                // Dispatch Email
                await sendEmailNotification(
                    task.assignedTo.email,
                    'ESCALATION',
                    { taskTitle: task.title, overdueDays, status: task.status },
                    [],
                    ccEmails
                );

                // Update anti-spam flag
                task.lastEscalationSentAt = now;
                await task.save();

                console.log(`📧 Escalation sent for Task ${task._id} (Overdue: ${overdueDays} days)`);
            }

            console.log('✅ Task Escalation Check complete.');
        } catch (error) {
            console.error('❌ Error during Task Escalation Check:', error);
        }
    });
};
