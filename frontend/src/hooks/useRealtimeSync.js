/**
 * useRealtimeSync.js
 * Connects to the backend SSE stream and updates Redux store in real-time.
 * Replaces polling as the primary sync mechanism. Falls back to polling if SSE fails.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentUser } from '../store/features/auth';
import { fetchTasks, fetchDashboardStats } from '../store/features/tasks';

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
    const currentTaskQuery = useSelector((state) => state.tasks.currentFetchParams);
    const currentStatsQuery = useSelector((state) => state.tasks.currentStatsParams);

    const startFallbackPolling = useCallback(() => {
        if (fallbackRef.current) return; // already running
        fallbackRef.current = setInterval(() => {
            const token = localStorage.getItem('token');
            if (!token) return;
            if (currentTaskQuery) {
                dispatch(fetchTasks(currentTaskQuery));
            }
            dispatch(fetchDashboardStats(currentStatsQuery));
            dispatch(getCurrentUser());
        }, FALLBACK_POLL_MS);
    }, [currentTaskQuery, currentStatsQuery, dispatch]);

    const stopFallbackPolling = useCallback(() => {
        if (fallbackRef.current) {
            clearInterval(fallbackRef.current);
            fallbackRef.current = null;
        }
    }, []);

    const connectSSE = useCallback(function connectSSEFunc() {
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

            es.addEventListener('invalidate_tasks', () => {
                try {
                    // Refresh dashboard and task data using current filter state
                    if (currentTaskQuery) {
                        dispatch(fetchTasks(currentTaskQuery));
                    }
                    dispatch(fetchDashboardStats(currentStatsQuery));
                } catch (error) {
                    console.error('SSE invalidate parse error:', error);
                }
            });

            es.addEventListener('profile', (event) => {
                try {
                    const user = JSON.parse(event.data);
                    // Update auth slice with fresh user data
                    dispatch({ type: 'auth/getMe/fulfilled', payload: user });
                    localStorage.setItem('user', JSON.stringify(user));
                } catch (error) {
                    console.error('SSE profile parse error:', error);
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
                retryRef.current = setTimeout(connectSSEFunc, delay);
            };
        } catch (error) {
            console.warn('EventSource not supported, using polling fallback', error?.message || error);
            startFallbackPolling();
        }
    }, [currentTaskQuery, currentStatsQuery, dispatch, isAuthenticated, startFallbackPolling, stopFallbackPolling]);

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
    }, [isAuthenticated, dispatch, connectSSE, startFallbackPolling, stopFallbackPolling]);
};

export default useRealtimeSync;
