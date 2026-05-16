/**
 * exportUtils.js
 * Utilities for exporting data to Excel, CSV, and PDF formats
 */

import ExcelJS from 'exceljs';

/**
 * Export tasks to Excel
 * @param {array} tasks - Array of task objects
 * @param {string} fileName - Output file name (without extension)
 */
export const exportTasksToExcel = async (tasks, fileName = 'tasks') => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Tasks');

        // Define columns
        worksheet.columns = [
            { header: 'Task ID', key: '_id', width: 20 },
            { header: 'Title', key: 'title', width: 30 },
            { header: 'Description', key: 'description', width: 40 },
            { header: 'Priority', key: 'priority', width: 12 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Department', key: 'department', width: 15 },
            { header: 'Branch', key: 'branch', width: 15 },
            { header: 'Assigned To', key: 'assignedTo.firstName', width: 15 },
            { header: 'Deadline', key: 'deadline', width: 15 },
            { header: 'Created Date', key: 'createdAt', width: 15 },
            { header: 'Completed Date', key: 'completedAt', width: 15 },
        ];

        // Add data rows
        tasks.forEach(task => {
            worksheet.addRow({
                _id: task._id,
                title: task.title,
                description: task.description?.substring(0, 100),
                priority: task.priority,
                status: task.status,
                department: task.department,
                branch: task.branch,
                'assignedTo.firstName': task.assignedTo?.firstName || 'Unassigned',
                deadline: new Date(task.deadline).toLocaleDateString(),
                createdAt: new Date(task.createdAt).toLocaleDateString(),
                completedAt: task.completedAt ? new Date(task.completedAt).toLocaleDateString() : '-',
            });
        });

        // Style header row
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

        // Style data rows with alternating colors
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                if (rowNumber % 2 === 0) {
                    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                }
            }
        });

        // Generate and download
        const buffer = await workbook.xlsx.writeBuffer();
        downloadFile(buffer, `${fileName}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        return { success: true, message: 'Tasks exported successfully' };
    } catch (error) {
        console.error('Error exporting tasks to Excel:', error);
        return { success: false, message: 'Failed to export tasks', error: error.message };
    }
};

/**
 * Export tasks to CSV
 * @param {array} tasks - Array of task objects
 * @param {string} fileName - Output file name (without extension)
 */
export const exportTasksToCSV = (tasks, fileName = 'tasks') => {
    try {
        const headers = [
            'Task ID',
            'Title',
            'Description',
            'Priority',
            'Status',
            'Department',
            'Branch',
            'Assigned To',
            'Deadline',
            'Created Date',
            'Completed Date',
        ];

        const rows = tasks.map(task => [
            task._id,
            `"${task.title.replace(/"/g, '""')}"`, // Escape quotes
            `"${task.description?.substring(0, 100).replace(/"/g, '""') || ''}"`,
            task.priority,
            task.status,
            task.department,
            task.branch,
            task.assignedTo?.firstName || 'Unassigned',
            new Date(task.deadline).toLocaleDateString(),
            new Date(task.createdAt).toLocaleDateString(),
            task.completedAt ? new Date(task.completedAt).toLocaleDateString() : '-',
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(',')),
        ].join('\n');

        downloadFile(new Blob([csv], { type: 'text/csv' }), `${fileName}.csv`, 'text/csv');

        return { success: true, message: 'Tasks exported to CSV successfully' };
    } catch (error) {
        console.error('Error exporting tasks to CSV:', error);
        return { success: false, message: 'Failed to export tasks', error: error.message };
    }
};

/**
 * Export users to Excel
 * @param {array} users - Array of user objects
 * @param {string} fileName - Output file name
 */
export const exportUsersToExcel = async (users, fileName = 'users') => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Users');

        worksheet.columns = [
            { header: 'User ID', key: '_id', width: 20 },
            { header: 'First Name', key: 'firstName', width: 15 },
            { header: 'Last Name', key: 'lastName', width: 15 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'Department', key: 'department', width: 15 },
            { header: 'Branch', key: 'branch', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Join Date', key: 'createdAt', width: 15 },
        ];

        users.forEach(user => {
            worksheet.addRow({
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone || '-',
                role: user.role,
                department: user.department || '-',
                branch: user.branch || '-',
                status: user.isActive ? 'Active' : 'Inactive',
                createdAt: new Date(user.createdAt).toLocaleDateString(),
            });
        });

        // Style header
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

        const buffer = await workbook.xlsx.writeBuffer();
        downloadFile(buffer, `${fileName}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        return { success: true, message: 'Users exported successfully' };
    } catch (error) {
        console.error('Error exporting users:', error);
        return { success: false, message: 'Failed to export users', error: error.message };
    }
};

/**
 * Export task performance report
 * @param {array} tasks - Array of task objects
 * @param {string} department - Department name
 */
export const exportPerformanceReport = async (tasks, department = 'All') => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Performance Report');

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const pendingTasks = tasks.filter(t => t.status === 'pending').length;
        const rejectedTasks = tasks.filter(t => t.status === 'rejected').length;
        const completionRate = ((completedTasks / totalTasks) * 100).toFixed(2);

        // Add summary section
        worksheet.addRow(['Performance Report']);
        worksheet.addRow([`Department: ${department}`]);
        worksheet.addRow([`Generated: ${new Date().toLocaleDateString()}`]);
        worksheet.addRow([]);

        worksheet.addRow(['Summary']);
        worksheet.addRow(['Total Tasks', totalTasks]);
        worksheet.addRow(['Completed', completedTasks]);
        worksheet.addRow(['Pending', pendingTasks]);
        worksheet.addRow(['Rejected', rejectedTasks]);
        worksheet.addRow(['Completion Rate (%)', completionRate]);

        const buffer = await workbook.xlsx.writeBuffer();
        downloadFile(buffer, `performance-report-${department}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        return { success: true, message: 'Report exported successfully' };
    } catch (error) {
        console.error('Error exporting report:', error);
        return { success: false, message: 'Failed to export report', error: error.message };
    }
};

/**
 * Helper function to download file
 * @param {Blob|Buffer} content - File content
 * @param {string} fileName - File name
 * @param {string} mimeType - MIME type
 */
const downloadFile = (content, fileName, mimeType) => {
    const url = window.URL.createObjectURL(new Blob([content], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export default {
    exportTasksToExcel,
    exportTasksToCSV,
    exportUsersToExcel,
    exportPerformanceReport,
};
