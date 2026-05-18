import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../services/api';

export const loginUser = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
    try {
        const res = await api.post('/auth/login', { email, password });
        if (res.data.success) {
            const { token, ...userData } = res.data.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            return userData;
        }
        return rejectWithValue(res.data.message);
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
});

export const getCurrentUser = createAsyncThunk('auth/getMe', async (_, { rejectWithValue }) => {
    try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
            localStorage.setItem('user', JSON.stringify(res.data.data));
            return res.data.data;
        }
        return rejectWithValue(res.data.message);
    } catch (err) {
        return rejectWithValue(err.response?.data?.message);
    }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (userData, { rejectWithValue }) => {
    try {
        const res = await api.put(`/users/${userData._id}`, userData);
        if (res.data.success) {
            localStorage.setItem('user', JSON.stringify(res.data.data));
            return res.data.data;
        }
        return rejectWithValue(res.data.message);
    } catch (err) {
        return rejectWithValue(err.response?.data?.message);
    }
});

const parseStoredUser = () => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
};

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: parseStoredUser(),
        token: localStorage.getItem('token') || null,
        loading: false,
        error: null,
        isAuthenticated: !!localStorage.getItem('token'),
    },
    reducers: {
        logout: (state) => {
            state.user = null; state.token = null; state.isAuthenticated = false; state.error = null;
            localStorage.removeItem('token'); localStorage.removeItem('user');
        },
        clearError: (state) => { state.error = null; },
        setUser: (state, action) => { state.user = action.payload; state.isAuthenticated = true; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(loginUser.fulfilled, (s, a) => { s.loading = false; s.user = a.payload; s.token = localStorage.getItem('token'); s.isAuthenticated = true; s.error = null; })
            .addCase(loginUser.rejected, (s, a) => { s.loading = false; s.error = a.payload; s.isAuthenticated = false; })
            .addCase(getCurrentUser.pending, (s) => { s.loading = true; })
            .addCase(getCurrentUser.fulfilled, (s, a) => { s.loading = false; s.user = a.payload; s.isAuthenticated = true; })
            .addCase(getCurrentUser.rejected, (s) => {
                s.loading = false; s.user = null; s.token = null; s.isAuthenticated = false;
                localStorage.removeItem('token'); localStorage.removeItem('user');
            })
            .addCase(updateProfile.fulfilled, (s, a) => {
                s.user = { ...s.user, ...a.payload };
                localStorage.setItem('user', JSON.stringify(s.user));
            });
    },
});

export const { logout, clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
