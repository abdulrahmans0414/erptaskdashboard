import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ── AUTH ──────────────────────────────────────────────────────────
export const login              = (email, password) => api.post('/auth/login', { email, password });
export const getMe              = () => api.get('/auth/me');
export const signup             = (data) => api.post('/auth/signup', data);
export const verifyOtp          = (email, otp) => api.post('/auth/verify-otp', { email, otp });
export const checkRegStatus     = (email) => api.get(`/auth/registration-status?email=${encodeURIComponent(email)}`);

// ── PENDING REGISTRATIONS (Admin) ─────────────────────────────────
export const getPendingRegistrations = () => api.get('/auth/pending-registrations');
export const getAllPendingRegistrations = (status) => api.get(`/auth/pending-registrations${status ? `?status=${status}` : ''}`);
export const reviewRegistration = (id, action, adminNote) =>
    api.put(`/auth/pending-registrations/${id}/review`, { action, adminNote });

// ── USERS ─────────────────────────────────────────────────────────
export const getUsers           = () => api.get('/users');
export const getUserById        = (id) => api.get(`/users/${id}`);
export const createUser         = (data) => api.post('/users', data);
export const updateUser         = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser         = (id) => api.delete(`/users/${id}`);
export const getUsersByDepartment = (dept) => api.get(`/users/department/${dept}`);
export const getUsersByBranch   = (branch) => api.get(`/users/branch/${branch}`);
export const uploadAvatar       = (id, formData) =>
    api.put(`/users/avatar/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// ── TASKS ─────────────────────────────────────────────────────────
export const getDashboardStats  = (params) => api.get('/tasks/dashboard/stats', { params });
export const getTasks           = (params) => api.get('/tasks', { params });
export const getTaskById        = (id) => api.get(`/tasks/${id}`);
export const createTask         = (data) => {
    const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
    return api.post('/tasks', data, isForm ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
};
export const updateTask         = (id, data) => api.put(`/tasks/${id}`, data);
export const deleteTask         = (id) => api.delete(`/tasks/${id}`);
export const getEmployeeSummary = () => api.get('/tasks/employees/summary');

// ── TASK ACTIONS ──────────────────────────────────────────────────
export const startTask          = (id) => api.put(`/tasks/${id}/start`);
export const submitTaskWithTime = (id, submissionNote, actualMinutes) =>
    api.put(`/tasks/${id}/submit`, { submissionNote, actualMinutes });
export const submitTaskWithAttachments = (id, formData) =>
    api.put(`/tasks/${id}/submit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const reviewTask         = (id, status, adminComments, reviewStage) =>
    api.put(`/tasks/${id}/review`, { status, adminComments, reviewStage });
export const addComment         = (id, comment) => api.put(`/tasks/${id}/comment`, { comment });
export const reassignTask      = (id, data) => api.put(`/tasks/${id}/reassign`, data);
export const getTimeReport      = (params) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/tasks/reports/time${q ? `?${q}` : ''}`);
};

// ── NOTIFICATIONS ─────────────────────────────────────────────────
export const getNotifications   = () => api.get('/notifications');
export const markAsRead         = (id) => api.put(`/notifications/${id}/read`);
export const markAllAsRead      = () => api.put('/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);

// ── DEPARTMENTS ───────────────────────────────────────────────────
export const getDepartments     = () => api.get('/departments');
export const createDepartment   = (data) => api.post('/departments', data);
export const updateDepartment   = (id, data) => api.put(`/departments/${id}`, data);
export const deleteDepartment   = (id) => api.delete(`/departments/${id}`);

// ── BRANCHES ──────────────────────────────────────────────────────
export const getBranches        = () => api.get('/branches');
export const getBranchById      = (id) => api.get(`/branches/${id}`);
export const createBranch       = (data) => api.post('/branches', data);
export const updateBranch       = (id, data) => api.put(`/branches/${id}`, data);
export const deleteBranch       = (id) => api.delete(`/branches/${id}`);
export const getBranchStats     = (id) => api.get(`/branches/${id}/stats`);

// ── UNIFIED TASK STATUS ───────────────────────────────────────────
export const updateTaskStatus = async (id, action, data, adminComments) => {
    if (action === 'start') return startTask(id);
    if (action === 'submit') {
        const note = typeof data === 'string' ? data : data?.submissionNote || '';
        const mins = typeof data === 'object' ? data?.actualMinutes : undefined;
        return submitTaskWithTime(id, note, mins);
    }
    if (action === 'approved' || action === 'rejected') return reviewTask(id, action, adminComments);
    if (action === 'comment') return addComment(id, data);
    return api.put(`/tasks/${id}/status`, { status: action, submissionNote: data });
};

export default api;
