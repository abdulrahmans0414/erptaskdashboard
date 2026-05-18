import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../services/api.js';

// Async thunks
export const fetchNotifications = createAsyncThunk(
    'notifications/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/notifications');
            if (response.data.success) {
                return {
                    notifications: response.data.data,
                    unreadCount: response.data.unreadCount,
                };
            }
            return rejectWithValue(response.data.message);
        } catch (error) {
            return rejectWithValue(error.response?.data?.message);
        }
    }
);

export const markAsRead = createAsyncThunk(
    'notifications/markRead',
    async (id, { rejectWithValue }) => {
        try {
            const response = await api.put(`/notifications/${id}/read`);
            if (response.data.success) {
                return id;
            }
            return rejectWithValue(response.data.message);
        } catch (error) {
            return rejectWithValue(error.response?.data?.message);
        }
    }
);

export const markAllAsRead = createAsyncThunk(
    'notifications/markAllRead',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.put('/notifications/read-all');
            if (response.data.success) {
                return true;
            }
            return rejectWithValue(response.data.message);
        } catch (error) {
            return rejectWithValue(error.response?.data?.message);
        }
    }
);

const notificationSlice = createSlice({
    name: 'notifications',
    initialState: {
        items: [],
        unreadCount: 0,
        loading: false,
        error: null,
    },
    reducers: {
        clearNotificationError: (state) => {
            state.error = null;
        },
        addNotification: (state, action) => {
            state.items.unshift(action.payload);
            if (!action.payload.isRead) {
                state.unreadCount += 1;
            }
        },
        clearNotifications: (state) => {
            state.items = [];
            state.unreadCount = 0;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch notifications
            .addCase(fetchNotifications.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.notifications;
                state.unreadCount = action.payload.unreadCount;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Mark as read
            .addCase(markAsRead.fulfilled, (state, action) => {
                const notification = state.items.find(n => n._id === action.payload);
                if (notification && !notification.isRead) {
                    notification.isRead = true;
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })
            // Mark all as read
            .addCase(markAllAsRead.fulfilled, (state) => {
                state.items.forEach(notification => {
                    notification.isRead = true;
                });
                state.unreadCount = 0;
            });
    },
});

export const { clearNotificationError, addNotification, clearNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;