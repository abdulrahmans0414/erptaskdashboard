import api from './client.js';

export const login = (email, password) => api.post('/auth/login', { email, password });
export const getMe = () => api.get('/auth/me');
export const signup = (data) => api.post('/auth/signup', data);
export const verifyOtp = (email, otp) => api.post('/auth/verify-otp', { email, otp });
export const checkRegStatus = (email) => api.get(`/auth/registration-status?email=${encodeURIComponent(email)}`);
