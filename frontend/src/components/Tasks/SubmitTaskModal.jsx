import { useState, useEffect } from "react";
import { submitTaskWithAttachments } from "../../services/api";

const SubmitTaskModal = ({ isOpen, onClose, task, onSubmitted }) => {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // Live timer
  useEffect(() => {
    if (!isOpen || !task?.startedAt) return;

    const updateTimer = () => {
      const start = new Date(task.startedAt);
      const now = new Date();
      const diff = Math.floor((now - start) / (1000 * 60));
      setElapsedTime(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [isOpen, task?.startedAt]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setNote("");
      setError("");
      setAttachments([]);
      setShowPreview(false);
    }
  }, [isOpen]);

  const formatElapsedTime = (minutes) => {
    if (!minutes || minutes === 0) return "Less than a minute";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins} minutes`;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map((file) => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!note.trim()) {
      setError("Please add submission notes describing your work.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("submissionNote", note);
      if (typeof elapsedTime === "number" && elapsedTime > 0) {
        formData.append("actualMinutes", String(elapsedTime));
      }
      attachments.forEach((att) => {
        if (att?.file) formData.append("submissionAttachments", att.file);
      });

      const result = await submitTaskWithAttachments(task._id, formData);

      if (result?.data?.success !== false) {
        onSubmitted();
        onClose();
        setNote("");
        setAttachments([]);
      } else {
        setError(result?.data?.message || "Failed to submit task");
      }
    } catch (error) {
      console.error("Error submitting task:", error);
      setError(
        error.response?.data?.message ||
          "Failed to submit task. Please try again.",
      );
    }
    setLoading(false);
  };

  const getTimeColor = () => {
    if (elapsedTime > 480) return "text-red-600"; // > 8 hours
    if (elapsedTime > 240) return "text-orange-600"; // > 4 hours
    if (elapsedTime > 60) return "text-yellow-600"; // > 1 hour
    return "text-green-600";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-5 py-4 rounded-t-xl flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">📤 Submit Task</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Review your work before submitting
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition text-xl"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Task Info Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📋</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800">{task.title}</h3>
                {task.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-gray-500">
                  <span>🏢 {task.department}</span>
                  <span>📍 {task.branch}</span>
                  <span>⚡ {task.priority}</span>
                  {task.estimatedHours > 0 && (
                    <span>
                      🎯 Est: {task.estimatedHours}h{" "}
                      {task.estimatedMinutes || 0}m
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Time Tracking */}
          {task.startedAt && (
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                ⏱️ Time Tracking
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-gray-500">Started At</p>
                  <p className="text-sm font-medium text-gray-700">
                    {new Date(task.startedAt).toLocaleTimeString()}
                  </p>
                  <p className="text-[9px] text-gray-400">
                    {new Date(task.startedAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Current Time</p>
                  <p className="text-sm font-medium text-gray-700">
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Time Spent</p>
                  <p className={`text-sm font-bold ${getTimeColor()}`}>
                    {formatElapsedTime(elapsedTime)}
                  </p>
                </div>
              </div>
              {elapsedTime > 240 && (
                <div className="mt-2 text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  ⚠️ This task has taken over 4 hours. Consider adding detailed
                  notes.
                </div>
              )}
            </div>
          )}

          {/* Previous Attempts */}
          {task.attempts && task.attempts.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <p className="text-xs font-medium text-yellow-800 mb-1">
                📝 Previous Attempts: {task.attempts.length}
              </p>
              {task.attempts[task.attempts.length - 1]?.adminFeedback && (
                <p className="text-xs text-yellow-700 mt-1">
                  <span className="font-medium">Last Feedback:</span>{" "}
                  {task.attempts[task.attempts.length - 1].adminFeedback}
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <span className="flex-shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Submission Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setError("");
                }}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition ${
                  error && !note.trim()
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300"
                }`}
                rows="4"
                placeholder="Describe what you completed, challenges faced, solutions implemented, and any pending items..."
                required
                maxLength={2000}
              />
              <div className="flex justify-between mt-1">
                <p className="text-[10px] text-gray-400">
                  Be specific about your work done
                </p>
                <p className="text-[10px] text-gray-400">{note.length}/2000</p>
              </div>
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                📎 Attachments{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition cursor-pointer"
                onClick={() => document.getElementById("fileUpload").click()}
              >
                <input
                  id="fileUpload"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xlsx,.zip"
                />
                <div className="text-2xl mb-1">📁</div>
                <p className="text-xs text-gray-500">Click to upload files</p>
                <p className="text-[10px] text-gray-400">
                  Images, PDFs, Documents (Max 5MB each)
                </p>
              </div>

              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {attachments.map((att, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-xs"
                    >
                      {att.preview ? (
                        <img
                          src={att.preview}
                          alt={att.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-600">
                          📄
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-700 truncate">
                          {att.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {formatFileSize(att.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Note Templates */}
            <div>
              <p className="text-[10px] text-gray-400 mb-1.5">
                Quick templates:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "✅ Task completed as per requirements.",
                  "📝 All deliverables attached.",
                  "⏱️ Completed within estimated time.",
                  "🔧 Minor issues fixed during development.",
                  "📋 Ready for review and feedback.",
                ].map((template, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setNote((prev) => prev + (prev ? "\n" : "") + template)
                    }
                    className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition"
                  >
                    {template.slice(0, 40)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2 border-t">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Submitting...
                  </>
                ) : (
                  <>📤 Submit for Review</>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubmitTaskModal;
