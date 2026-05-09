import React, { createContext, useContext, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout as logoutAction, loginUser, getCurrentUser } from '../store/slices/authSlice';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const dispatch = useDispatch();
    const { user, loading, isAuthenticated } = useSelector((state) => state.auth);

    // App load hone par token se user fetch karo
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && !user) {
            dispatch(getCurrentUser());
        }
    }, []);

    const login = async (email, password) => {
        try {
            const result = await dispatch(loginUser({ email, password })).unwrap();
            return { success: true, data: result };
        } catch (err) {
            return { success: false, message: err || 'Login failed. Please try again.' };
        }
    };

    const logout = () => {
        dispatch(logoutAction());
    };

    const refreshUser = async () => {
        try {
            await dispatch(getCurrentUser()).unwrap();
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};
