import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getDeletedTasks, restoreTask, hardDeleteDocument } from "../../services/api";
import toast from "react-hot-toast";

const PRIORITY_STYLES = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-100",
  medium: "bg-amber-50 text-amber-700 border-amber-100",
  high: "bg-orange-50 text-orange-700 border-orange-100",
  urgent: "bg-rose-50 text-rose-700 border-rose-100",
};

const PRIORITY_DOTS = {
  low: "bg-emerald-400",
  medium: "bg-amber-400",
  high: "bg-orange-400",
  urgent: "bg-rose-500",
};

const TrashTasks = () => {
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [restoringId, setRestoringId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null);

  const loadDeleted = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDeletedTasks();
      if (response.data.success) {
        setDeletedTasks(response.data.data || []);
      } else {
        toast.error("Failed to load deleted tasks");
      }
    } catch (error) {
      console.error("Error loading deleted tasks:", error);
      toast.error("Failed to load deleted tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeleted();
  }, [loadDeleted]);

  const handleRestore = async (id, title) => {
    setRestoringId(id);
    try {
      const response = await restoreTask(id);
      if (response.data.success) {
        toast.success(`📋 Task "${title}" restored successfully!`);
        setDeletedTasks((prev) => prev.filter((t) => t._id !== id));
      } else {
        toast.error(response.data.message || "Failed to restore task");
      }
    } catch (error) {
      console.error("Error restoring task:", error);
      toast.error(error.response?.data?.message || "Failed to restore task");
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async (id, title) => {
    setDeletingId(id);
    try {
      const response = await hardDeleteDocument("task", id);
      if (response.data.success) {
        toast.success(`🔥 Task "${title}" permanently purged!`);
        setDeletedTasks((prev) => prev.filter((t) => t._id !== id));
      } else {
        toast.error(response.data.message || "Failed to permanently delete task");
      }
    } catch (error) {
      console.error("Error permanently deleting task:", error);
      toast.error(error.response?.data?.message || "Failed to permanently delete task");
    } finally {
      setDeletingId(null);
      setConfirmDeleteDoc(null);
    }
  };

  const filtered = deletedTasks.filter((t) => {
    const q = search.toLowerCase();
    return (
      !q ||
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.department?.toLowerCase().includes(q) ||
      t.priority?.toLowerCase().includes(q) ||
      t.branch?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-rose-200">
              🗑️
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Recycle Bin: Tasks
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Review and restore soft-deleted workspace tasks back to active boards.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadDeleted}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 shadow-sm transition disabled:opacity-50"
            >
              <span className={loading ? "animate-spin inline-block" : ""}>🔄</span>
              Refresh
            </button>
            <Link
              to="/tasks"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 shadow-sm transition"
            >
              ← Back to Tasks
            </Link>
          </div>
        </div>

        {/* Info Badge */}
        {!loading && (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${filtered.length > 0 ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${filtered.length > 0 ? "bg-rose-500" : "bg-emerald-500"}`} />
              {filtered.length} {filtered.length === 1 ? "task" : "tasks"} in archive
            </span>
          </div>
        )}

        {/* Search */}
        <div className="relative bg-white rounded-2xl border border-slate-100 p-1 shadow-sm">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base select-none">
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search archived tasks by title, description, department..."
            className="w-full bg-transparent border-0 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-0 transition"
          />
        </div>

        {/* Data List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200/60 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200 py-16 text-center shadow-sm"
          >
            <div className="text-6xl mb-4">♻️</div>
            <p className="text-slate-700 font-bold text-lg">No Tasks in Recycle Bin</p>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              There are no deleted task logs matching your parameters.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((t) => {
                const priority = t.priority || "medium";
                return (
                  <motion.div
                    key={t._id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white hover:bg-slate-50/50 rounded-2xl border border-slate-200/60 shadow-sm hover:border-slate-300 transition gap-4"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-slate-800 text-base truncate">{t.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium}`}>
                          <span className={`w-1 h-1 rounded-full ${PRIORITY_DOTS[priority] || PRIORITY_DOTS.medium}`} />
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {t.description || "No description provided."}
                      </p>
                      <div className="text-[10px] text-slate-500 font-semibold flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>🏢 Dept: {t.department || "—"}</span>
                        <span>•</span>
                        <span>📍 Branch: {t.branch || "—"}</span>
                        {t.deletedAt && (
                          <>
                            <span>•</span>
                            <span>🗑️ Deleted: {new Date(t.deletedAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:items-center gap-2 sm:self-center">
                      <button
                        onClick={() => handleRestore(t._id, t.title)}
                        disabled={restoringId === t._id || deletingId === t._id}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-1.5"
                      >
                        {restoringId === t._id ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Restoring…
                          </>
                        ) : (
                          <>🔄 Restore Task</>
                        )}
                      </button>

                      <button
                        onClick={() => setConfirmDeleteDoc(t)}
                        disabled={restoringId === t._id || deletingId === t._id}
                        className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-1.5"
                      >
                        {deletingId === t._id ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Purging…
                          </>
                        ) : (
                          <>🔥 Permanent Delete</>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Premium Glassmorphic Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 max-w-md w-full overflow-hidden space-y-5"
            >
              {/* Modal Header */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl flex-shrink-0">
                  ⚠️
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Confirm Permanent Delete
                  </h3>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    Task: {confirmDeleteDoc.title}
                  </p>
                </div>
              </div>

              {/* Modal Message */}
              <p className="text-slate-600 text-sm leading-relaxed">
                Are you sure you want to permanently delete this task? This action is <strong className="text-rose-600">IRREVERSIBLE</strong> and will permanently purge all Cloudinary attachments and database records.
              </p>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setConfirmDeleteDoc(null)}
                  disabled={deletingId === confirmDeleteDoc._id}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteDoc._id, confirmDeleteDoc.title)}
                  disabled={deletingId === confirmDeleteDoc._id}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-250 transition flex items-center gap-1.5"
                >
                  {deletingId === confirmDeleteDoc._id ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Purging…
                    </>
                  ) : (
                    <>🔥 Delete Permanently</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrashTasks;
