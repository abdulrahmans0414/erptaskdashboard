import api from './client.js';

export const login = (email, password) => api.post('/auth/login', { email, password });
export const getMe = () => api.get('/auth/me');
export const signup = (data) => api.post('/auth/signup', data);
export const verifyOtp = (email, otp) => api.post('/auth/verify-otp', { email, otp });
export const checkRegStatus = (email) => api.get(`/auth/registration-status?email=${encodeURIComponent(email)}`);

// Admin: pending registrations badge count (used in Header.jsx)
export const getPendingRegistrations = (status = 'pending,otp_sent') =>
    api.get(`/auth/pending-registrations?status=${status}`);

// Admin: full list (used in PendingRegistrations.jsx)
export const getAllPendingRegistrations = (status) =>
    api.get(`/auth/pending-registrations${status ? `?status=${status}` : ''}`);

// Admin: approve / reject / send_otp action
export const reviewRegistration = (id, action, adminNote = '') =>
    api.put(`/auth/pending-registrations/${id}/review`, { action, adminNote });
