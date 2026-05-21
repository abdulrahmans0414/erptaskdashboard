import api from './client.js';

export const getBranches = (params) => api.get('/branches', { params });
export const getBranchById = (id) => api.get(`/branches/${id}`);
export const createBranch = (data) => api.post('/branches', data);
export const updateBranch = (id, data) => api.put(`/branches/${id}`, data);
export const deleteBranch = (id) => api.delete(`/branches/${id}`);
export const getBranchStats = (id) => api.get(`/branches/${id}/stats`);
export const getDeletedBranches = () => api.get('/branches/deleted/all');
export const restoreBranch = (id) => api.post(`/branches/${id}/restore`);
