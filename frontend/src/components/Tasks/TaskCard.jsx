import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  startTask,
  reviewTask,
  addTaskComment,
} from "../../store/features/tasks";
import { useAuth } from "../../context/AuthContext";
import { updateTask, reassignTask, getUsers, deleteTask } from "../../services/api";
import { useSettings } from "../../context/SettingsContext";
import toast from "react-hot-toast";

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:5001/api"
).replace(/\/api\/?$/, "");

const getAttachmentUrl = (url) => {
  if (!url) return "";
  let cleanUrl = url.replace(/\\/g, '/');
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.includes('res.cloudinary.com')) {
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = cleanUrl.replace(/^(https?:)\/*/, '$1//');
    }
    return cleanUrl;
  }
  return `${API_ORIGIN}${cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl}`;
};

const FMT_TIME = (m) => {
  if (!m) return "0m";
  const h = Math.floor(m / 60),
    r = m % 60;
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
};

const AttachmentGrid = ({ attachments, title }) => {
  if (!attachments || attachments.length === 0) return null;

  const isImage = (filename, fileType) => {
    if (fileType && fileType.startsWith('image/')) return true;
    return /\.(jpe?g|png|gif|webp|svg)$/i.test(filename || '');
  };

  const getDocIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📕';
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return '📦';
    if (['doc', 'docx'].includes(ext)) return '📘';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📗';
    if (['ppt', 'pptx'].includes(ext)) return '📙';
    return '📄';
  };

  return (
    <div className="mt-3">
      {title && (
        <span className="block text-xs font-semibold text-zinc-500 mb-1.5 flex items-center gap-1.5">
          📎 {title}
        </span>
      )}
      <div className="flex flex-wrap gap-2">
        {attachments.map((att, idx) => {
          const url = getAttachmentUrl(att.fileUrl);
          const isImg = isImage(att.filename, att.fileType);
          const filename = att.filename || `File_${idx + 1}`;

          if (isImg) {
            return (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block w-14 h-14 aspect-square overflow-hidden border border-zinc-200 rounded-lg hover:scale-105 transition-transform duration-200 shadow-sm flex-shrink-0 bg-zinc-50 group"
                title={`View ${filename}`}
              >
                <img
                  src={url}
                  alt={filename}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'w-full h-full flex items-center justify-center text-xs font-bold bg-zinc-100 text-zinc-400';
                      fallback.innerText = 'IMG';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </a>
            );
          }

          return (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg hover:scale-105 transition-transform duration-200 text-[11px] text-zinc-700 font-medium shadow-sm flex-shrink-0"
              title={`Download ${filename}`}
            >
              <span className="text-sm">{getDocIcon(filename)}</span>
              <span className="max-w-[120px] truncate">{filename}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

const CompactAttachments = ({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;

  const getDocIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📕';
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return '📦';
    if (['doc', 'docx'].includes(ext)) return '📘';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📗';
    if (['ppt', 'pptx'].includes(ext)) return '📙';
    const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
    if (isImg) return '🖼️';
    return '📄';
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-0.5">
      {attachments.map((att, idx) => {
        const url = getAttachmentUrl(att.fileUrl);
        const filename = att.filename || `File_${idx + 1}`;

        return (
          <a
            key={idx}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg hover:scale-105 transition-all duration-200 text-[10px] text-zinc-700 font-medium shadow-sm flex-shrink-0"
            title={`Download ${filename}`}
          >
            <span className="text-xs">{getDocIcon(filename)}</span>
            <span className="max-w-[120px] truncate">{filename}</span>
          </a>
        );
      })}
    </div>
  );
};

const STATUS = {
  pending: {
    color: "bg-amber-100 text-amber-800 border-amber-200",
    label: "Pending",
    dot: "bg-amber-400",
  },
  "in-progress": {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    label: "In Progress",
    dot: "bg-blue-500",
  },
  submitted: {
    color: "bg-violet-100 text-violet-800 border-violet-200",
    label: "Submitted",
    dot: "bg-violet-500",
  },
  approved: {
    color: "bg-green-100 text-green-800 border-green-200",
    label: "Approved",
    dot: "bg-green-500",
  },
  completed: {
    color: "bg-green-100 text-green-800 border-green-200",
    label: "Completed",
    dot: "bg-green-500",
  },
  rejected: {
    color: "bg-red-100 text-red-800 border-red-200",
    label: "Rejected",
    dot: "bg-red-500",
  },
  reassigned: {
    color: "bg-orange-100 text-orange-800 border-orange-200",
    label: "Reassigned",
    dot: "bg-orange-400",
  },
};

const PRIORITY = {
  low: "bg-gray-100 text-gray-600 border-gray-200",
  medium: "bg-sky-100 text-sky-700 border-sky-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100 text-red-700 border-red-200 animate-pulse",
};

// ── PROGRESS STEPPER ────────────────────────────────────────────
const STEPS = ["pending", "in-progress", "submitted", "completed"];
function Stepper({ status }) {
  const normalizedStatus =
    status === "reassigned"
      ? "pending"
      : status === "approved" || status === "completed"
        ? "completed"
        : status;
  const cur = STEPS.indexOf(normalizedStatus);
  const curSafe = cur === -1 ? 0 : cur;
  const rej = normalizedStatus === "rejected";
  return (
    <div className="flex items-center gap-0 mb-3">
      {STEPS.map((s, i) => {
        const done = i < (rej ? 2 : curSafe);
        const active = !rej && i === curSafe;
        const rejected = rej && i === 2;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 flex-shrink-0 transition-all ${
                rejected
                  ? "bg-red-500 border-red-500 text-white"
                  : done
                    ? "bg-green-500 border-green-500 text-white"
                    : active
                      ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-300"
                      : "bg-gray-100 border-gray-300 text-gray-400"
              }`}
            >
              {rejected ? "✕" : done ? "✓" : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 ${done && !rej ? "bg-green-400" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SUBMIT MODAL ─────────────────────────────────────────────────
function SubmitModal({ task, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [attachments, setAttachments] = useState([]);
  const elapsed = task.startedAt
    ? Math.floor((Date.now() - new Date(task.startedAt)) / 60000)
    : 0;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments((prev) => [
      ...prev,
      ...files.map((f) => ({
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      })),
    ]);
  };

  const removeAttachment = (idx) =>
    setAttachments((prev) => prev.filter((_, i) => i !== idx));

  const formatSize = (bytes) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)}KB`
      : `${(bytes / 1024 / 1024).toFixed(1)}MB`;

  const handle = async () => {
    if (!note.trim()) {
      setErr("Please describe what you did.");
      return;
    }
    setLoading(true);
    try {
      const { submitTaskWithAttachments } = await import("../../services/api");
      const formData = new FormData();
      formData.append("submissionNote", note);
      formData.append("actualMinutes", String(elapsed));
      attachments.forEach(
        (att) => att.file && formData.append("submissionAttachments", att.file),
      );
      const result = await submitTaskWithAttachments(task._id, formData);
      if (result?.data?.success !== false) {
        onDone();
      } else {
        setErr(result?.data?.message || "Submission failed");
      }
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Submission failed");
    }
    setLoading(false);
  };

  return (
    <Modal title="📤 Submit Task" onClose={onClose}>
      <div className="bg-blue-50 rounded-xl p-3 mb-4 text-sm">
        <p className="font-medium text-gray-700">{task.title}</p>
        <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
          <span>
            ⏱️ Time: <strong>{FMT_TIME(elapsed)}</strong>
          </span>
          <span>
            📅 Due:{" "}
            <strong>{new Date(task.dueDate).toLocaleDateString()}</strong>
          </span>
          <span>🔄 Attempt #{(task.currentAttempt || 0) + 1}</span>
        </div>
      </div>
      {err && (
        <p className="text-red-600 text-xs mb-3 bg-red-50 px-3 py-2 rounded-lg">
          {err}
        </p>
      )}
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        What did you complete? <span className="text-red-500">*</span>
      </label>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setErr("");
        }}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows="4"
        placeholder="Describe what you completed, any challenges faced, and deliverables..."
      />
      {/* File Attachments */}
      <div className="mt-3">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          📎 Attachments{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center hover:border-blue-400 transition cursor-pointer bg-gray-50"
          onClick={() => document.getElementById("taskcard-file-input").click()}
        >
          <input
            id="taskcard-file-input"
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xlsx,.zip"
          />
          <p className="text-xs text-gray-500">
            📁 Click to upload • Images, PDFs, Docs
          </p>
        </div>
        {attachments.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-xs border"
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
                    {formatSize(att.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={handle}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition"
        >
          {loading ? "Submitting..." : "📤 Submit for Review"}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ── REVIEW MODAL ─────────────────────────────────────────────────
function ReviewModal({ task, stage, onClose, onDone }) {
  const dispatch = useDispatch();
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (status) => {
    setLoading(true);
    try {
      await dispatch(
        reviewTask({
          taskId: task._id,
          status,
          adminComments: feedback,
          reviewStage: stage,
        }),
      ).unwrap();
      toast.success(`Task ${status} successfully!`);
      onDone();
    } catch (e) {
      toast.error(e || "Failed to review task");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        stage === "department"
          ? "📋 Department Head Review"
          : "📋 Branch Head Review"
      }
      onClose={onClose}
    >
      <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
        <p className="font-semibold text-gray-800">{task.title}</p>
        <p className="text-gray-500 text-xs">
          👤 {task.assignedTo?.name} · 🏢 {task.department} · 📍 {task.branch}
        </p>

        <AttachmentGrid attachments={task.taskFormAttachments} title="Task Attachments" />
        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
          <div className="bg-white rounded-lg p-2 border">
            <span className="text-gray-500">Time Spent</span>
            <p className="font-bold mt-0.5">{FMT_TIME(task.totalTimeSpent)}</p>
          </div>
          <div className="bg-white rounded-lg p-2 border">
            <span className="text-gray-500">Attempt #</span>
            <p className="font-bold mt-0.5">{task.currentAttempt || 1}</p>
          </div>
        </div>
        {task.submissionNote && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 text-xs mt-2">
            <p className="font-semibold text-blue-700 mb-1">Employee's Note:</p>
            <p className="text-gray-700 whitespace-pre-wrap">
              {task.submissionNote}
            </p>
            {task.attempts &&
              task.attempts.length > 0 &&
              task.attempts[task.attempts.length - 1].submissionAttachments
                ?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <AttachmentGrid
                    attachments={task.attempts[task.attempts.length - 1].submissionAttachments}
                    title="Submission Attachments"
                  />
                </div>
              )}
          </div>
        )}
      </div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Feedback (Optional)
      </label>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        rows="3"
        placeholder="Leave feedback for the employee..."
      />
      <div className="flex gap-2">
        <button
          onClick={() => handle("approved")}
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition"
        >
          ✅ Approve
        </button>
        <button
          onClick={() => handle("rejected")}
          disabled={loading}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition"
        >
          ❌ Reject & Return
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ── EDIT MODAL ────────────────────────────────────────────────────
function EditModal({ task, onClose, onDone }) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || "",
    priority: task.priority,
    dueDate: task.dueDate?.slice(0, 10) || "",
  });
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try {
      await updateTask(task._id, form);
      toast.success("Task updated successfully!");
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to update task");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal title="✏️ Edit Task" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label text-sm font-semibold">Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="w-full px-3 py-2 border rounded-xl text-sm mt-1"
          />
        </div>
        <div>
          <label className="label text-sm font-semibold">Description</label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            className="w-full px-3 py-2 border rounded-xl text-sm mt-1"
            rows="3"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label text-sm font-semibold">Priority</label>
            <select
              value={form.priority}
              onChange={(e) =>
                setForm((p) => ({ ...p, priority: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded-xl text-sm mt-1"
            >
              {["low", "medium", "high", "urgent"].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-sm font-semibold">Due Date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) =>
                setForm((p) => ({ ...p, dueDate: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded-xl text-sm mt-1"
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <button
          onClick={handle}
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-200"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ── REASSIGN MODAL ─────────────────────────────────────────────
function ReassignModal({ task, onClose, onDone }) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [showUsers, setShowUsers] = useState(false);

  useState(() => {
    const load = async () => {
      try {
        const res = await getUsers();
        if (res.data.success) {
          setUsers(
            res.data.data.filter(
              (u) =>
                u.role !== "admin" &&
                u._id !== (task.assignedTo?._id || task.assignedTo),
            ),
          );
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.department?.toLowerCase().includes(search.toLowerCase()),
  );

  const handle = async () => {
    if (!selected) return setError("Please select an employee");
    if (!reason.trim()) return setError("Please provide a reason");
    setLoading(true);
    try {
      await reassignTask(task._id, { assignedTo: selected, reason });
      toast.success("Task reassigned successfully!");
      onDone();
    } catch (e) {
      const msg = e.response?.data?.message || "Reassign failed";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="🔄 Reassign Task" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl text-xs text-orange-800">
          <p className="font-bold mb-1">Current Assignee:</p>
          <p>
            {task.assignedTo?.name || "Unassigned"} ({task.department} •{" "}
            {task.branch})
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Select New Assignee
          </label>
          <div className="relative">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by name, ID or department..."
                className="w-full pl-8 pr-10 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                value={search}
                onFocus={() => setShowUsers(true)}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowUsers(true);
                  if (selected) setSelected("");
                }}
              />
              <button
                type="button"
                onClick={() => setShowUsers(!showUsers)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showUsers ? "▴" : "▾"}
              </button>
            </div>

            {showUsers && (
              <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y bg-white shadow-xl animate-scaleIn origin-top">
                {filtered.map((u) => (
                  <div
                    key={u._id}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent focus loss
                      setSelected(u._id);
                      setSearch(u.name);
                      setShowUsers(false);
                    }}
                    className={`p-3 text-sm cursor-pointer transition-colors flex items-center justify-between group ${
                      selected === u._id
                        ? "bg-blue-50 ring-1 ring-inset ring-blue-200"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span
                        className={`font-medium ${selected === u._id ? "text-blue-700" : "text-gray-700"}`}
                      >
                        {u.name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        ID: {u.employeeId || "N/A"} • {u.department} • {u.role}
                      </span>
                    </div>
                    {selected === u._id && (
                      <span className="text-blue-600 text-xs">✓</span>
                    )}
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="p-4 text-center text-gray-400 text-xs italic">
                    No matching employees found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Reason for Reassignment
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
            rows="2"
            placeholder="e.g. Employee on leave, priority shift..."
          />
        </div>

        {error && (
          <p className="text-red-600 text-[10px] bg-red-50 p-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handle}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-200"
          >
            {loading ? "Processing..." : "Confirm Reassign"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── ACTIVITY / COMMENTS DRAWER ─────────────────────────────────
function ActivityDrawer({ task, onClose }) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleComment = async () => {
    if (!comment.trim()) return;
    setLoading(true);
    try {
      await dispatch(addTaskComment({ taskId: task._id, comment })).unwrap();
      setComment("");
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const all = [
    ...(task.activityLog || []).map((l) => ({
      ...l,
      type: "activity",
      time: l.timestamp,
    })),
    ...(task.comments || []).map((c) => ({
      ...c,
      type: "comment",
      time: c.createdAt,
      msg: c.message,
      who: c.userName,
      role: c.userRole,
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time));

  return (
    <Modal title="📋 Timeline & Updates" onClose={onClose} wide>
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 text-xs space-y-2">
        <div className="font-semibold text-gray-800">Overall Workflow</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-gray-600">
          <span>
            ▶ Start:{" "}
            <span className="font-medium text-gray-800">
              {task.startedAt ? new Date(task.startedAt).toLocaleString() : "—"}
            </span>
          </span>
          <span>
            📤 Submit:{" "}
            <span className="font-medium text-gray-800">
              {task.submittedAt
                ? new Date(task.submittedAt).toLocaleString()
                : "—"}
            </span>
          </span>
          <span>
            🏢 Dept:{" "}
            <span className="font-medium text-gray-800">
              {task.workflow?.departmentReview?.status || "pending"}
            </span>
          </span>
          <span>
            📍 Branch:{" "}
            <span className="font-medium text-gray-800">
              {task.workflow?.branchReview?.status || "not-started"}
            </span>
          </span>
        </div>
        {(task.workflow?.departmentReview?.reviewedAt ||
          task.workflow?.branchReview?.reviewedAt) && (
          <div className="text-gray-500">
            Dept reviewed:{" "}
            {task.workflow?.departmentReview?.reviewedAt
              ? new Date(
                  task.workflow.departmentReview.reviewedAt,
                ).toLocaleString()
              : "—"}{" "}
            · Branch reviewed:{" "}
            {task.workflow?.branchReview?.reviewedAt
              ? new Date(task.workflow.branchReview.reviewedAt).toLocaleString()
              : "—"}
          </div>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto space-y-2 mb-4 pr-1">
        {all.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-6">
            No activity yet
          </p>
        )}
        {all.map((item, i) => (
          <div
            key={i}
            className={`flex gap-3 p-3 rounded-xl text-xs ${item.type === "comment" ? "bg-blue-50 border border-blue-100" : "bg-gray-50"}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-[10px] ${item.type === "comment" ? "bg-blue-500" : "bg-gray-400"}`}
            >
              {item.type === "comment" ? item.who?.charAt(0) || "?" : "●"}
            </div>
            <div className="min-w-0">
              {item.type === "comment" ? (
                <>
                  <p className="font-semibold text-gray-800">
                    {item.who}{" "}
                    <span className="text-gray-400 font-normal">
                      ({item.role})
                    </span>
                  </p>
                  <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">
                    {item.msg}
                  </p>
                  <AttachmentGrid attachments={item.attachments} />
                </>
              ) : (
                <p className="text-gray-600">{item.details || item.action}</p>
              )}
              <p className="text-gray-400 mt-1">
                {new Date(item.time).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      {/* Add comment */}
      <div className="border-t pt-3">
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Add Update
        </label>
        <div className="flex gap-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="2"
            placeholder="Add a comment or update..."
          />
          <button
            onClick={handleComment}
            disabled={loading || !comment.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-blue-700 transition"
          >
            {loading ? "..." : "Post"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── MODAL WRAPPER ─────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-lg" : "max-w-md"} max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── MAIN TASKCARD ─────────────────────────────────────────────────
export default function TaskCard({ task, onUpdate }) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [modal, setModal] = useState(null); // 'submit'|'review'|'edit'|'activity'|'reassign'
  const [reviewStage, setReviewStage] = useState(null); // 'department'|'branch'
  const [starting, setStarting] = useState(false);

  const closeModal = () => {
    setModal(null);
    setReviewStage(null);
    if (onUpdate) onUpdate();
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this task? This action cannot be undone and will permanently remove all attachments.")) {
      return;
    }
    try {
      await deleteTask(task._id);
      toast.success("Task deleted successfully");
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete task");
    }
  };

  const userId = user?._id || user?.id;
  const isAssigned =
    task.assignedTo?._id?.toString() === userId?.toString() ||
    task.assignedTo?.toString() === userId?.toString();
  const isTeamMember = task.assignedTeam?.some(
    (m) => (m._id || m)?.toString() === userId?.toString(),
  );
  const isAdmin = user?.role === "admin";
  const isDeptHead =
    user?.role === "department-head" && task.department === user.department;
  const isBranchHead =
    user?.role === "branch-head" && task.branch === user.branch;
  const hasWorkflow = Boolean(
    task.workflow?.departmentReview && task.workflow?.branchReview,
  );

  const deptReviewStatus = task.workflow?.departmentReview?.status || "pending";
  const branchReviewStatus = task.workflow?.branchReview?.status || "pending";

  const canReviewDepartment =
    (isAdmin || isDeptHead) &&
    task.status === "submitted" &&
    (!hasWorkflow || deptReviewStatus === "pending");

  const canReviewBranch =
    (isAdmin || isBranchHead) &&
    task.status === "submitted" &&
    (!hasWorkflow ||
      (deptReviewStatus === "approved" && branchReviewStatus === "pending"));

  const canReview = canReviewDepartment || canReviewBranch;
  const isAssigner =
    task.assignedBy?._id?.toString() === userId?.toString() ||
    task.assignedBy?.toString() === userId?.toString();
  const canManage = isAdmin || isDeptHead || isBranchHead || isAssigner;
  const isOverdue =
    new Date(task.dueDate) < new Date() &&
    !["completed", "approved"].includes(task.status);
  const isMine = isAssigned || isTeamMember;

  const handleStart = async () => {
    setStarting(true);
    try {
      await dispatch(startTask(task._id)).unwrap();
      toast.success("Task started! Time tracking begun.");
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error(e || "Failed to start");
    }
    setStarting(false);
  };

  const st = STATUS[task.status] || STATUS.pending;
  const pr = PRIORITY[task.priority] || PRIORITY.medium;

  return (
    <>
      <div
        className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all p-4 ${isOverdue ? "border-red-200 bg-red-50/20" : ""}`}
      >
        {/* Progress stepper */}
        <Stepper status={task.status} />

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <h3 className="font-semibold text-gray-900 text-sm">
                {task.title}
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${st.color}`}
              >
                {st.label}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${pr}`}
              >
                {task.priority}
              </span>
              {isOverdue && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-semibold">
                  ⏰ Overdue
                </span>
              )}
              {task.isTeamTask && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold">
                  👥 Team
                </span>
              )}
            </div>

            {task.description && (
              <p className="text-gray-500 text-xs mb-2 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400 mt-1">
              <span>
                📅 {new Date(task.dueDate).toLocaleDateString("en-IN")}
              </span>
              {task.assignedBy?.name && (
                <span className="font-medium text-gray-600">
                  Assigned by: {task.assignedBy.name}
                </span>
              )}
              {task.assignedTo?.name && (
                <span>👤 Assignee: {task.assignedTo.name}</span>
              )}
              <span>🏢 {task.department}</span>
              <span>📍 {task.branch}</span>
              {task.totalTimeSpent > 0 && (
                <span>⏱️ {FMT_TIME(task.totalTimeSpent)}</span>
              )}
              {task.currentAttempt > 1 && (
                <span>🔄 Attempt #{task.currentAttempt}</span>
              )}
            </div>

            {/* Compact Attachments */}
            {task.taskFormAttachments && task.taskFormAttachments.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold text-gray-400">📎 Attachments:</span>
                <CompactAttachments attachments={task.taskFormAttachments} />
              </div>
            )}

            {/* Submission note */}
            {task.submissionNote && (
              <div className="mt-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs">
                <span className="font-semibold text-gray-600">📝 Note: </span>
                <span className="text-gray-600">
                  {task.submissionNote.slice(0, 120)}
                  {task.submissionNote.length > 120 ? "…" : ""}
                </span>
              </div>
            )}

            {/* Submission attachments (visible to assignee) */}
            {(() => {
              const lastAttempt = task.attempts?.[task.attempts.length - 1];
              const subAtts = lastAttempt?.submissionAttachments || [];
              if (subAtts.length === 0) return null;
              return (
                <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs">
                  <span className="font-semibold text-blue-700 block mb-1">📁 Submitted Files:</span>
                  <CompactAttachments attachments={subAtts} />
                </div>
              );
            })()}

            {/* Admin feedback */}
            {task.adminComments && (
              <div
                className={`mt-2 px-3 py-2 rounded-xl text-xs border ${task.status === "rejected" ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"}`}
              >
                <span className="font-semibold text-gray-600">
                  💬 Feedback:{" "}
                </span>
                <span className="text-gray-700">
                  {task.adminComments.slice(0, 120)}
                </span>
              </div>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
            {/* Activity */}
            <button
              onClick={() => setModal("activity")}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-medium transition"
            >
              💬{" "}
              {(task.comments?.length || 0) + (task.activityLog?.length || 0) >
              0
                ? `Updates (${(task.comments?.length || 0) + (task.activityLog?.length || 0)})`
                : "Updates"}
            </button>

            {/* Edit & Reassign & Delete */}
            {canManage && (
              <div className="flex flex-col gap-1 w-full">
                <div className="flex gap-1">
                  <button
                    onClick={() => setModal("edit")}
                    className="flex-1 px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-[10px] font-medium transition whitespace-nowrap"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setModal("reassign")}
                    className="flex-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-medium transition whitespace-nowrap"
                  >
                    🔄 Reassign
                  </button>
                </div>
                {(isAdmin || isAssigner) && (
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-medium transition whitespace-nowrap"
                  >
                    🗑️ Delete Task
                  </button>
                )}
              </div>
            )}

            {/* Review */}
            {isAssigner && task.status === "submitted" && !canReview && (
              <button
                onClick={() => {
                  setReviewStage("assigner");
                  setModal("review");
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-semibold transition shadow-sm"
              >
                📋 Review Task
              </button>
            )}
            {canReviewDepartment && (
              <button
                onClick={() => {
                  setReviewStage("department");
                  setModal("review");
                }}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-semibold transition shadow-sm"
              >
                📋 Dept Review
              </button>
            )}
            {canReviewBranch && (
              <button
                onClick={() => {
                  setReviewStage("branch");
                  setModal("review");
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold transition shadow-sm"
              >
                📋 Branch Review
              </button>
            )}

            {/* Start */}
            {["pending", "rejected", "reassigned"].includes(task.status) &&
              isMine && (
                <button
                  onClick={handleStart}
                  disabled={starting}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {starting ? "Starting..." : "▶ Start Task"}
                </button>
              )}

            {/* Submit */}
            {task.status === "in-progress" && isMine && (
              <button
                onClick={() => setModal("submit")}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-semibold transition shadow-sm"
              >
                📤 Submit
              </button>
            )}

            {/* Status badges */}
            {task.status === "submitted" && isMine && !canReview && (
              <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-medium">
                {deptReviewStatus === "pending"
                  ? "⏳ Awaiting Department Review"
                  : deptReviewStatus === "approved" &&
                      branchReviewStatus === "pending"
                    ? "⏳ Awaiting Branch Review"
                    : "⏳ Awaiting Review"}
              </span>
            )}
            {["approved", "completed"].includes(task.status) && (
              <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[10px] font-semibold">
                ✅ Approved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === "submit" && (
        <SubmitModal
          task={task}
          onClose={() => setModal(null)}
          onDone={closeModal}
        />
      )}
      {modal === "review" && (
        <ReviewModal
          task={task}
          stage={reviewStage}
          onClose={() => {
            setModal(null);
            setReviewStage(null);
          }}
          onDone={closeModal}
        />
      )}
      {modal === "edit" && (
        <EditModal
          task={task}
          onClose={() => setModal(null)}
          onDone={closeModal}
        />
      )}
      {modal === "reassign" && (
        <ReassignModal
          task={task}
          onClose={() => setModal(null)}
          onDone={closeModal}
        />
      )}
      {modal === "activity" && (
        <ActivityDrawer task={task} onClose={() => setModal(null)} />
      )}
    </>
  );
}
