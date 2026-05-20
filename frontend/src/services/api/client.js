import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000, // 30 second timeout
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Only redirect on 401 if it's NOT a background/polling request
        if (
            error.response?.status === 401 &&
            !error.config?.url?.includes('/auth/login') &&
            !error.config?.url?.includes('/auth/me') // Don't redirect on background token refresh
        ) {
            // Small delay to avoid redirect loops during initial load
            const token = localStorage.getItem('token');
            if (!token) {
                // Only redirect if we have no token at all
                window.location.href = '/login';
            } else {
                // Token exists but got 401 - token may be expired, clear and redirect
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
