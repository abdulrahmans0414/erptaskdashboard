/**
 * ResponsiveModal.jsx
 * Accessible, responsive modal component with animations
 * Supports all screen sizes and keyboard navigation
 */

import { useEffect, useRef } from "react";
import { useFocusTrap } from "../hooks/useAccessibility";

/**
 * ResponsiveModal Component
 * @param {boolean} isOpen - Whether modal is open
 * @param {function} onClose - Callback to close modal
 * @param {string} title - Modal title
 * @param {React.ReactNode} children - Modal content
 * @param {React.ReactNode} footer - Footer content (usually buttons)
 * @param {string} size - Modal size: 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @param {boolean} closeable - Show close button
 * @param {function} onBackdropClick - Callback for backdrop click
 */
export default function ResponsiveModal({
  isOpen = false,
  onClose = () => {},
  title = "",
  children = null,
  footer = null,
  size = "md",
  closeable = true,
  onBackdropClick = null,
  className = "",
}) {
  const modalRef = useFocusTrap(isOpen, onClose);
  const backdropRef = useRef(null);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (backdropRef.current && e.target === backdropRef.current) {
      if (onBackdropClick) {
        onBackdropClick();
      } else {
        onClose();
      }
    }
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && closeable) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden"; // Prevent body scroll when modal is open

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, closeable, onClose]);

  if (!isOpen) return null;

  // Size classes
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-full mx-4",
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
      role="presentation"
    >
      {/* Modal Container */}
      <div
        ref={modalRef}
        className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-auto transform transition-all ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
            <h2 id="modal-title" className="text-lg font-bold text-gray-900">
              {title}
            </h2>
            {closeable && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
                aria-label="Close modal"
              >
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end sticky bottom-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Confirmation Dialog
 */
export function ConfirmDialog({
  isOpen = false,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  onConfirm = () => {},
  onCancel = () => {},
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDangerous = false,
}) {
  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      closeable={true}
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-gray-600">{message}</p>

        <div className="flex gap-3 justify-end pt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white font-medium transition ${
              isDangerous
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
}

/**
 * Alert Dialog
 */
export function AlertDialog({
  isOpen = false,
  title = "Alert",
  message = "",
  type = "info", // 'info', 'success', 'warning', 'error'
  onClose = () => {},
}) {
  const icons = {
    info: "✓",
    success: "✓",
    warning: "⚠️",
    error: "❌",
  };

  const colors = {
    info: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    error: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeable={false}
    >
      <div className={`p-4 rounded-lg border ${colors[type]}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{icons[type]}</span>
          <p className="pt-1">{message}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          OK
        </button>
      </div>
    </ResponsiveModal>
  );
}
