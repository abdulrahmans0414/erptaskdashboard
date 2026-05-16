/**
 * useAccessibility.js
 * Custom hook for keyboard navigation and accessibility features
 */

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook for managing focus trap and keyboard navigation in modals
 * @param {boolean} isOpen - Whether modal/component is open
 * @param {function} onClose - Callback when escape is pressed
 */
export const useFocusTrap = (isOpen, onClose) => {
    const elementRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            // Close on Escape
            if (e.key === 'Escape') {
                onClose?.();
                return;
            }

            // Tab focus trap
            if (e.key === 'Tab' && elementRef.current) {
                const focusableElements = elementRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );

                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                const activeElement = document.activeElement;

                // Shift + Tab on first element -> Focus last
                if (e.shiftKey && activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
                // Tab on last element -> Focus first
                else if (!e.shiftKey && activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    return elementRef;
};

/**
 * Hook for keyboard navigation in lists/tables
 * @param {array} items - Array of items
 * @param {function} onSelect - Callback when item is selected
 * @param {function} onDelete - Callback when delete is pressed
 */
export const useKeyboardNavigation = (items = [], onSelect = () => {}, onDelete = () => {}) => {
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef(null);

    const handleKeyDown = useCallback((e) => {
        const itemCount = items.length;
        let newIndex = selectedIndex;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                newIndex = selectedIndex === -1 ? 0 : Math.min(selectedIndex + 1, itemCount - 1);
                setSelectedIndex(newIndex);
                onSelect(items[newIndex]);
                break;

            case 'ArrowUp':
                e.preventDefault();
                newIndex = Math.max(selectedIndex - 1, -1);
                setSelectedIndex(newIndex);
                if (newIndex >= 0) onSelect(items[newIndex]);
                break;

            case 'Home':
                e.preventDefault();
                setSelectedIndex(0);
                onSelect(items[0]);
                break;

            case 'End':
                e.preventDefault();
                newIndex = itemCount - 1;
                setSelectedIndex(newIndex);
                onSelect(items[newIndex]);
                break;

            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) onSelect(items[selectedIndex]);
                break;

            case 'Delete':
                e.preventDefault();
                if (selectedIndex >= 0) onDelete(items[selectedIndex]);
                break;

            default:
                break;
        }
    }, [selectedIndex, items, onSelect, onDelete]);

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('keydown', handleKeyDown);
            return () => container.removeEventListener('keydown', handleKeyDown);
        }
    }, [handleKeyDown]);

    return { containerRef, selectedIndex, setSelectedIndex };
};

/**
 * Hook to announce changes to screen readers
 * @param {string} message - Message to announce
 * @param {string} type - 'polite' or 'assertive'
 */
export const useAnnounce = (message, type = 'polite') => {
    useEffect(() => {
        if (!message) return;

        // Create or get announcement div
        let announcer = document.getElementById('aria-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'aria-announcer';
            announcer.className = 'sr-only';
            announcer.setAttribute('aria-live', type);
            announcer.setAttribute('aria-atomic', 'true');
            document.body.appendChild(announcer);
        }

        announcer.textContent = message;

        // Clear after announcement
        const timer = setTimeout(() => {
            announcer.textContent = '';
        }, 1000);

        return () => clearTimeout(timer);
    }, [message, type]);
};

/**
 * Hook to handle click outside for closing dropdowns/modals
 * @param {function} onClose - Callback when clicking outside
 */
export const useClickOutside = (onClose) => {
    const elementRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (elementRef.current && !elementRef.current.contains(e.target)) {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return elementRef;
};

/**
 * Hook to skip to main content (accessibility best practice)
 */
export const useSkipToMain = () => {
    const skipRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key === 'M') {
                e.preventDefault();
                const main = document.querySelector('main');
                if (main) {
                    main.focus();
                    main.scrollIntoView();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return { skipRef };
};

export default {
    useFocusTrap,
    useKeyboardNavigation,
    useAnnounce,
    useClickOutside,
    useSkipToMain,
};
