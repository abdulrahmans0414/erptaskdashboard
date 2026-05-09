import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const updateInList = (items, payload) => {
    const i = items.findIndex(t => t._id === payload._id);
    if (i !== -1) items[i] = payload;
};

export const fetchTasks = createAsyncThunk('tasks/fetchTasks', async (_, { rejectWithValue }) => {
    try { return (await api.get('/tasks')).data.data; }
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
    initialState: { items: [], loading: false, error: null, lastFetched: null },
    reducers: {
        clearTaskError: (s) => { s.error = null; },
        updateTaskLocally: (s, a) => { updateInList(s.items, a.payload); },
    },
    extraReducers: (b) => {
        b
            .addCase(fetchTasks.pending, (s) => { s.loading = true; })
            .addCase(fetchTasks.fulfilled, (s, a) => { s.loading = false; s.items = a.payload; s.lastFetched = Date.now(); })
            .addCase(fetchTasks.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
            .addCase(startTask.fulfilled, (s, a) => { updateInList(s.items, a.payload); })
            .addCase(submitTask.fulfilled, (s, a) => { updateInList(s.items, a.payload); })
            .addCase(reviewTask.fulfilled, (s, a) => { updateInList(s.items, a.payload); })
            .addCase(addTaskComment.fulfilled, (s, a) => { updateInList(s.items, a.payload); });
    },
});

export const { clearTaskError, updateTaskLocally } = taskSlice.actions;
export default taskSlice.reducer;
