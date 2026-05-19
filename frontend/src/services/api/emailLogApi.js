import api from './client.js';

// Get email logs with optional filtering & pagination
export const getEmailLogs = (params = {}) => {
    return api.get('/email-logs', { params });
};

// Delete a specific email log
export const deleteEmailLog = (id) => {
    return api.delete(`/email-logs/${id}`);
};

// Resend a specific email log
export const resendEmailLog = (id) => {
    return api.post(`/email-logs/${id}/resend`);
};

// Bulk delete email logs
export const bulkDeleteEmailLogs = (data) => {
    return api.delete(`/email-logs/bulk`, { data });
};

// Sync emails from Gmail (Manual trigger)
export const syncFromGmail = () => {
    return api.post(`/email-logs/sync`);
};
