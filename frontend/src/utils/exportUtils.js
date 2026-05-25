/**
 * exportUtils.js
 * Utilities for exporting data to Excel, CSV, and PDF formats
 */

import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

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

/**
 * Helper to flatten and filter objects for export, removing sensitive PII.
 */
const sanitizeDataForExport = (data, excludeKeys = ['_id', 'password', 'avatar', 'avatarPublicId', 'createdAt', 'updatedAt', '__v', 'id']) => {
    return data.map(item => {
        const cleanItem = {};
        for (const [key, value] of Object.entries(item)) {
            if (!excludeKeys.includes(key)) {
                if (value === null || value === undefined || value === '') {
                    cleanItem[key] = 'N/A';
                } else if (Array.isArray(value)) {
                    cleanItem[key] = value.length > 0 ? value.join(', ') : 'N/A';
                } else if (typeof value === 'object') {
                    if (value instanceof Date) {
                        cleanItem[key] = value.toLocaleDateString();
                    } else if (value.name) {
                        cleanItem[key] = value.name;
                    } else if (value.firstName) {
                        cleanItem[key] = value.firstName;
                    } else {
                        cleanItem[key] = JSON.stringify(value);
                    }
                } else {
                    cleanItem[key] = String(value);
                }
            }
        }
        return cleanItem;
    });
};

/**
 * Export array of objects to CSV
 * @param {Array} data - Array of objects to export
 * @param {String} filename - Name of the output file
 */
export const exportToCSV = (data, filename = 'export.csv') => {
    if (!data || data.length === 0) return { success: false, message: 'No data to export' };
    
    try {
        const sanitizedData = sanitizeDataForExport(data);
        const csvString = Papa.unparse(sanitizedData);
        
        downloadFile(csvString, filename, 'text/csv');
        return { success: true, message: 'Exported successfully to CSV' };
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        return { success: false, message: 'Failed to export CSV', error: error.message };
    }
};

/**
 * Export array of objects to PDF using jsPDF and autotable
 * @param {Array} data - Array of objects to export
 * @param {String} filename - Name of the output file
 * @param {String} title - Title inside the PDF
 */
export const exportToPDF = (data, filename = 'export.pdf', title = 'Report') => {
    if (!data || data.length === 0) return { success: false, message: 'No data to export' };

    try {
        const sanitizedData = sanitizeDataForExport(data);
        
        const doc = new jsPDF('landscape'); // Landscape is usually better for tables
        
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        
        const head = [Object.keys(sanitizedData[0]).map(key => key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim())];
        const body = sanitizedData.map(item => Object.values(item));

        autoTable(doc, {
            startY: 36,
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [47, 54, 64] }, // Slate-800 to match Light Mode premium aesthetic
            styles: { fontSize: 9, cellPadding: 3 },
            alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate-50
        });

        doc.save(filename);
        return { success: true, message: 'Exported successfully to PDF' };
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        return { success: false, message: 'Failed to export PDF', error: error.message };
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
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'Department', key: 'department', width: 15 },
            { header: 'Branch', key: 'branch', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
        ];

        users.forEach(user => {
            worksheet.addRow({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || '-',
                role: user.role,
                department: user.department || '-',
                branch: user.branch || '-',
                status: user.isActive ? 'Active' : 'Inactive',
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

export default {
    exportToCSV,
    exportToPDF,
    exportUsersToExcel,
};
