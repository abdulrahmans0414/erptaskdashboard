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
