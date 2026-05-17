import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const fetchUsers = createAsyncThunk(
    'users/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/users');
            if (response.data.success) {
                return response.data.data;
            }
            return rejectWithValue(response.data.message);
        } catch (error) {
            return rejectWithValue(error.response?.data?.message);
        }
    }
);

export const createUser = createAsyncThunk(
    'users/create',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await api.post('/users', userData);
            if (response.data.success) {
                return response.data.data;
            }
            return rejectWithValue(response.data.message);
        } catch (error) {
            return rejectWithValue(error.response?.data?.message);
        }
    }
);

export const updateUser = createAsyncThunk(
    'users/update',
    async ({ id, userData }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/users/${id}`, userData);
            if (response.data.success) {
                return response.data.data;
            }
            return rejectWithValue(response.data.message);
        } catch (error) {
            return rejectWithValue(error.response?.data?.message);
        }
    }
);

export const deleteUser = createAsyncThunk(
    'users/delete',
    async (id, { rejectWithValue }) => {
        try {
            const response = await api.delete(`/users/${id}`);
            if (response.data.success) {
                return id;
            }
            return rejectWithValue(response.data.message);
        } catch (error) {
            return rejectWithValue(error.response?.data?.message);
        }
    }
);

export const fetchUsersByDepartment = createAsyncThunk(
    'users/fetchByDepartment',
    async (department, { rejectWithValue }) => {
        try {
            const response = await api.get(`/users/department/${department}`);
            if (response.data.success) {
                return response.data.data;
            }
            return rejectWithValue(response.data.message);
        } catch (error) {
            return rejectWithValue(error.response?.data?.message);
        }
    }
);

export const fetchUsersByBranch = createAsyncThunk(
    'users/fetchByBranch',
    async (branch, { rejectWithValue }) => {
        try {
            const response = await api.get(`/users/branch/${branch}`);
            if (response.data.success) {
                return response.data.data;
            }
            return rejectWithValue(response.data.message);
        } catch (error) {
            return rejectWithValue(error.response?.data?.message);
        }
    }
);

const userSlice = createSlice({
    name: 'users',
    initialState: {
        items: [],
        loading: false,
        error: null,
        selectedUser: null,
        filters: {
            department: null,
            branch: null,
            role: null,
        },
    },
    reducers: {
        clearUserError: (state) => {
            state.error = null;
        },
        setSelectedUser: (state, action) => {
            state.selectedUser = action.payload;
        },
        setUserFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearUserFilters: (state) => {
            state.filters = {
                department: null,
                branch: null,
                role: null,
            };
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch all users
            .addCase(fetchUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Create user
            .addCase(createUser.fulfilled, (state, action) => {
                state.items.push(action.payload);
            })
            // Update user
            .addCase(updateUser.fulfilled, (state, action) => {
                const index = state.items.findIndex(u => u._id === action.payload._id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedUser?._id === action.payload._id) {
                    state.selectedUser = action.payload;
                }
            })
            // Delete user
            .addCase(deleteUser.fulfilled, (state, action) => {
                state.items = state.items.filter(u => u._id !== action.payload);
                if (state.selectedUser?._id === action.payload) {
                    state.selectedUser = null;
                }
            })
            // Fetch by department
            .addCase(fetchUsersByDepartment.fulfilled, (state, action) => {
                state.items = action.payload;
            })
            // Fetch by branch
            .addCase(fetchUsersByBranch.fulfilled, (state, action) => {
                state.items = action.payload;
            });
    },
});

export const { clearUserError, setSelectedUser, setUserFilters, clearUserFilters } = userSlice.actions;
export default userSlice.reducer;