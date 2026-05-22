/**
 * useRealtimeSync.js
 * Connects to the backend SSE stream and updates Redux store in real-time.
 * Uses stable refs to prevent infinite re-render loops.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentUser } from '../store/features/auth';
import { fetchTasks, fetchDashboardStats } from '../store/features/tasks';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');
const SSE_URL = `${API_ORIGIN}/api/realtime/stream`;

// Fallback polling interval (ms) if SSE not supported / fails
const FALLBACK_POLL_MS = 15000;

export const useRealtimeSync = (isAuthenticated) => {
    const dispatch = useDispatch();
    const eventSourceRef = useRef(null);
    const fallbackRef = useRef(null);
    const retryRef = useRef(null);
    const retryCount = useRef(0);
    const isAuthenticatedRef = useRef(isAuthenticated);

    // Use refs for current params so we never need them in dependency arrays
    const currentTaskQuery = useSelector((state) => state.tasks.currentFetchParams);
    const currentStatsQuery = useSelector((state) => state.tasks.currentStatsParams);
    const taskQueryRef = useRef(currentTaskQuery);
    const statsQueryRef = useRef(currentStatsQuery);

    // Keep refs up to date without triggering effect re-runs
    useEffect(() => {
        taskQueryRef.current = currentTaskQuery;
    }, [currentTaskQuery]);

    useEffect(() => {
        statsQueryRef.current = currentStatsQuery;
    }, [currentStatsQuery]);

    useEffect(() => {
        isAuthenticatedRef.current = isAuthenticated;
    }, [isAuthenticated]);

    const stopFallbackPolling = useCallback(() => {
        if (fallbackRef.current) {
            clearInterval(fallbackRef.current);
            fallbackRef.current = null;
        }
    }, []);

    const startFallbackPolling = useCallback(() => {
        if (fallbackRef.current) return; // already running
        fallbackRef.current = setInterval(() => {
            const token = localStorage.getItem('token');
            if (!token || !isAuthenticatedRef.current) return;
            if (taskQueryRef.current) {
                dispatch(fetchTasks(taskQueryRef.current));
            }
            dispatch(fetchDashboardStats(statsQueryRef.current || {}));
            dispatch(getCurrentUser());
        }, FALLBACK_POLL_MS);
    }, [dispatch]);

    // connectSSE defined with empty deps — reads current state from refs
    const connectSSE = useCallback(function connectSSEFunc() {
        const token = localStorage.getItem('token');
        if (!token || !isAuthenticatedRef.current) return;

        // Close any existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        try {
            const url = `${SSE_URL}?token=${encodeURIComponent(token)}`;
            const es = new EventSource(url);
            eventSourceRef.current = es;

            es.addEventListener('connected', () => {
                retryCount.current = 0;
                stopFallbackPolling();
            });

            es.addEventListener('invalidate_tasks', () => {
                try {
                    if (taskQueryRef.current) {
                        dispatch(fetchTasks(taskQueryRef.current));
                    }
                    dispatch(fetchDashboardStats(statsQueryRef.current || {}));
                } catch (error) {
                    console.error('SSE invalidate parse error:', error);
                }
            });

            es.addEventListener('invalidate_emails', () => {
                window.dispatchEvent(new Event('invalidate_emails'));
            });

            es.addEventListener('profile', (event) => {
                try {
                    const user = JSON.parse(event.data);
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

                // Exponential backoff reconnect (max 30s)
                const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
                retryCount.current += 1;
                retryRef.current = setTimeout(connectSSEFunc, delay);
            };
        } catch (error) {
            console.warn('EventSource not supported, using polling fallback', error?.message || error);
            startFallbackPolling();
        }
    }, [dispatch, startFallbackPolling, stopFallbackPolling]); // stable deps only

    useEffect(() => {
        if (!isAuthenticated) {
            // Cleanup on logout
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            stopFallbackPolling();
            if (retryRef.current) clearTimeout(retryRef.current);
            return;
        }

        // Initial data load
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
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            stopFallbackPolling();
            if (retryRef.current) clearTimeout(retryRef.current);
        };
    // Only re-run when auth state actually changes
    }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useRealtimeSync;
