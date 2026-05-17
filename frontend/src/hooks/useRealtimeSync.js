/**
 * useRealtimeSync.js
 * Connects to the backend SSE stream and updates Redux store in real-time.
 * Replaces polling as the primary sync mechanism. Falls back to polling if SSE fails.
 */
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { getCurrentUser } from '../store/features/auth/authSlice';
import { fetchTasks, fetchDashboardStats } from '../store/features/tasks/taskSlice';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const SSE_URL = `${API_ORIGIN}/api/realtime/stream`;

// Fallback polling interval (ms) if SSE not supported / fails
const FALLBACK_POLL_MS = 10000;

export const useRealtimeSync = (isAuthenticated) => {
    const dispatch = useDispatch();
    const eventSourceRef = useRef(null);
    const fallbackRef = useRef(null);
    const retryRef = useRef(null);
    const retryCount = useRef(0);

    const startFallbackPolling = () => {
        if (fallbackRef.current) return; // already running
        fallbackRef.current = setInterval(() => {
            const token = localStorage.getItem('token');
            if (!token) return;
            dispatch(fetchTasks());
            dispatch(fetchDashboardStats());
            dispatch(getCurrentUser());
        }, FALLBACK_POLL_MS);
    };

    const stopFallbackPolling = () => {
        if (fallbackRef.current) {
            clearInterval(fallbackRef.current);
            fallbackRef.current = null;
        }
    };

    const connectSSE = () => {
        const token = localStorage.getItem('token');
        if (!token || !isAuthenticated) return;

        // Close any existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        try {
            // EventSource doesn't support custom headers; pass token as query param
            const url = `${SSE_URL}?token=${encodeURIComponent(token)}`;
            const es = new EventSource(url);
            eventSourceRef.current = es;

            es.addEventListener('connected', () => {
                retryCount.current = 0;
                stopFallbackPolling(); // SSE is working; stop fallback
                console.log('🔴 Realtime SSE connected');
            });

            es.addEventListener('tasks', (e) => {
                try {
                    const { tasks, stats } = JSON.parse(e.data);
                    // Directly update Redux store with fresh data
                    // Adapt SSE data to the new paginated store structure
                    dispatch({ 
                        type: 'tasks/fetchTasks/fulfilled', 
                        payload: { 
                            data: tasks,
                            pagination: {
                                total: tasks.length,
                                page: 1,
                                pages: 1
                            }
                        } 
                    });
                } catch (err) {
                    console.error('SSE tasks parse error:', err);
                }
            });

            es.addEventListener('profile', (e) => {
                try {
                    const user = JSON.parse(e.data);
                    // Update auth slice with fresh user data
                    dispatch({ type: 'auth/getMe/fulfilled', payload: user });
                    localStorage.setItem('user', JSON.stringify(user));
                } catch (err) {
                    console.error('SSE profile parse error:', err);
                }
            });

            es.onerror = () => {
                console.warn('SSE error - falling back to polling');
                es.close();
                eventSourceRef.current = null;
                startFallbackPolling();

                // Exponential backoff reconnect
                const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
                retryCount.current += 1;
                retryRef.current = setTimeout(connectSSE, delay);
            };
        } catch (err) {
            console.warn('EventSource not supported, using polling fallback');
            startFallbackPolling();
        }
    };

    useEffect(() => {
        if (!isAuthenticated) {
            // Cleanup on logout
            eventSourceRef.current?.close();
            eventSourceRef.current = null;
            stopFallbackPolling();
            if (retryRef.current) clearTimeout(retryRef.current);
            return;
        }

        // Initial data load immediately
        const token = localStorage.getItem('token');
        if (token) {
            dispatch(fetchTasks());
            dispatch(fetchDashboardStats());
            dispatch(getCurrentUser());
        }

        // Try SSE first, fallback to polling
        if (typeof EventSource !== 'undefined') {
            connectSSE();
        } else {
            startFallbackPolling();
        }

        return () => {
            eventSourceRef.current?.close();
            eventSourceRef.current = null;
            stopFallbackPolling();
            if (retryRef.current) clearTimeout(retryRef.current);
        };
    }, [isAuthenticated, dispatch]);
};

export default useRealtimeSync;
