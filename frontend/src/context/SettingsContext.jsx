import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        departments: ['IT', 'HR', 'Graphic', 'Academic', 'Finance', 'Marketing', 'Legal', 'Transport', 'Operations'],
        branches: ['Gaurabagh', 'Vikas Nagar', 'Kalyanpur', 'Kursi', 'Hive', 'Ring Road', 'Muazzam Nagar', 'Aziz Nagar'],
        userCustomFields: []
    });
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings');
            if (res.data.success) {
                setSettings(res.data.data);
            }
        } catch (error) {
            console.error("Failed to load system settings:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const updateSettings = async (newSettings) => {
        try {
            const res = await api.put('/settings', newSettings);
            if (res.data.success) {
                setSettings(res.data.data);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Failed to update settings:", error);
            throw error;
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, fetchSettings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};
