import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth';
import taskReducer from './features/tasks';
import userReducer from './features/users';
import notificationReducer from './features/notifications';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        tasks: taskReducer,
        users: userReducer,
        notifications: notificationReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});