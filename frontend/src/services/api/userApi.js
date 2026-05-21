import api from './client.js';

export const getUsers = (params) => api.get('/users', { params });
export const getUserById = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const getUsersByDepartment = (department, branch) => api.get(`/users/department/${department}`, { params: branch ? { branch } : {} });
export const getUsersByBranch = (branch) => api.get(`/users/branch/${branch}`);
export const uploadAvatar = (id, formData) =>
    api.put(`/users/avatar/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getDeletedUsers = () => api.get('/users/deleted/all');
export const restoreUser = (id) => api.post(`/users/${id}/restore`);
