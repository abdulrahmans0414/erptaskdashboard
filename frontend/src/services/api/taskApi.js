import api from './client.js';

export const getDashboardStats = (params) => api.get('/tasks/dashboard/stats', { params });
export const getTasks = (params) => api.get('/tasks', { params });
export const getTaskById = (id) => api.get(`/tasks/${id}`);
export const createTask = (data) => {
    const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
    return api.post('/tasks', data, isForm ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
};
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
export const getEmployeeSummary = () => api.get('/tasks/employees/summary');
export const startTask = (id) => api.put(`/tasks/${id}/start`);
export const submitTaskWithTime = (id, submissionNote, actualMinutes) =>
    api.put(`/tasks/${id}/submit`, { submissionNote, actualMinutes });
export const submitTaskWithAttachments = (id, formData) =>
    api.put(`/tasks/${id}/submit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const reviewTask = (id, status, adminComments, reviewStage) =>
    api.put(`/tasks/${id}/review`, { status, adminComments, reviewStage });
export const addComment = (id, comment) => api.put(`/tasks/${id}/comment`, { comment });
export const reassignTask = (id, data) => api.put(`/tasks/${id}/reassign`, data);
export const getTimeReport = (params) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/tasks/reports/time${q ? `?${q}` : ''}`);
};
