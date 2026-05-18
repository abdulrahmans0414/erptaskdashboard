import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../services/api.js';

const updateInList = (items, payload) => {
    const i = items.findIndex(t => t._id === payload._id);
    if (i !== -1) items[i] = payload;
};

export const fetchTasks = createAsyncThunk('tasks/fetchTasks', async (params, { rejectWithValue }) => {
    try { 
        const fetchParams = { limit: 10, ...params }; // Default limit to 10 for pagination
        return (await api.get('/tasks', { params: fetchParams })).data; 
    }
    catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const fetchDashboardStats = createAsyncThunk('tasks/fetchDashboardStats', async (params, { rejectWithValue }) => {
    try { return (await api.get('/tasks/dashboard/stats', { params })).data.data; }
    catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const startTask = createAsyncThunk('tasks/startTask', async (taskId, { rejectWithValue }) => {
    try { return (await api.put(`/tasks/${taskId}/start`)).data.data; }
    catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const submitTask = createAsyncThunk('tasks/submitTask', async ({ taskId, submissionNote, actualMinutes }, { rejectWithValue }) => {
    try { return (await api.put(`/tasks/${taskId}/submit`, { submissionNote, actualMinutes })).data.data; }
    catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const reviewTask = createAsyncThunk('tasks/reviewTask', async ({ taskId, status, adminComments, reviewStage }, { rejectWithValue }) => {
    try { return (await api.put(`/tasks/${taskId}/review`, { status, adminComments, reviewStage })).data.data; }
    catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const addTaskComment = createAsyncThunk('tasks/addComment', async ({ taskId, comment }, { rejectWithValue }) => {
    try { return (await api.put(`/tasks/${taskId}/comment`, { comment })).data.data; }
    catch (e) { return rejectWithValue(e.response?.data?.message); }
});

const taskSlice = createSlice({
    name: 'tasks',
    initialState: {
        items: [],
        pagination: {
            total: 0,
            page: 1,
            pages: 1
        },
        loading: false,
        error: null,
        lastFetched: null,
        isPolling: false,
        dashboardStats: null,
        statsLoading: false,
        statsLastFetched: null,
        currentFetchParams: {
            page: 1,
            limit: 10,
            search: '',
            status: 'all',
            priority: 'all',
            department: 'all',
            branch: 'all',
        },
        currentStatsParams: {},
    },
    reducers: {
        clearTaskError: (s) => { s.error = null; },
        updateTaskLocally: (s, a) => { updateInList(s.items, a.payload); },
        setPollingStatus: (s, a) => { s.isPolling = a.payload; },
        clearStats: (s) => { s.dashboardStats = null; },
    },
    extraReducers: (b) => {
        b
            .addCase(fetchTasks.pending, (s, a) => {
                s.loading = true;
                s.currentFetchParams = { ...(a.meta.arg || {}), limit: (a.meta.arg && a.meta.arg.limit) || 10 };
            })
            .addCase(fetchTasks.fulfilled, (s, a) => {
                s.loading = false;
                s.items = a.payload.data;
                s.pagination = a.payload.pagination || s.pagination;
                s.lastFetched = Date.now();
            })
            .addCase(fetchTasks.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

            .addCase(fetchDashboardStats.pending, (s, a) => {
                s.statsLoading = true;
                s.currentStatsParams = a.meta.arg || {};
            })
            .addCase(fetchDashboardStats.fulfilled, (s, a) => {
                s.statsLoading = false;
                s.dashboardStats = a.payload;
                s.statsLastFetched = Date.now();
            })
            .addCase(fetchDashboardStats.rejected, (s) => { s.statsLoading = false; })

            .addCase(startTask.fulfilled, (s, a) => { updateInList(s.items, a.payload); })
            .addCase(submitTask.fulfilled, (s, a) => { updateInList(s.items, a.payload); })
            .addCase(reviewTask.fulfilled, (s, a) => { updateInList(s.items, a.payload); })
            .addCase(addTaskComment.fulfilled, (s, a) => { updateInList(s.items, a.payload); });
    },
});

export const { clearTaskError, updateTaskLocally, setPollingStatus, clearStats } = taskSlice.actions;
export default taskSlice.reducer;
