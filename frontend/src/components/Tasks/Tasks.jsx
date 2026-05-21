import { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTasks, setPollingStatus, fetchDashboardStats } from "../../store/features/tasks";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import TaskCard from "./TaskCard";
import CreateTaskModal from "./CreateTaskModal";
import { motion, AnimatePresence } from "framer-motion";

import { useSettings } from "../../context/SettingsContext";
import { getBranches, getDeletedTasks, restoreTask } from "../../services/api";

// ── Priority badge helpers ────────────────────────────
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

// ── Stat card accent colours (left border only) ───────
const STAT_META = [
  { l: "Total",       key: "total",      accent: "border-l-slate-400",  icon: "📋", iconBg: "bg-slate-50" },
  { l: "Pending",     key: "pending",    accent: "border-l-amber-400",  icon: "⏳", iconBg: "bg-amber-50" },
  { l: "In Progress", key: "inProgress", accent: "border-l-blue-500",   icon: "🔄", iconBg: "bg-blue-50"  },
  { l: "Submitted",   key: "submitted",  accent: "border-l-violet-500", icon: "📤", iconBg: "bg-violet-50"},
  { l: "Completed",   key: "approved",   accent: "border-l-emerald-500",icon: "✅", iconBg: "bg-emerald-50"},
];

export default function Tasks() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const { items: allTasks, pagination, loading, dashboardStats } = useSelector((s) => s.tasks);

  const BRANCHES = settings?.branches || [
    "Central Gaurabagh", "Vikas Nagar", "Hive", "Hifz Academy", "Kursi Road", "Muazzam Nagar", "Aziz Nagar", "Mailaraiganj"
  ];
  const DEPTS = settings?.departments || [
    "IT", "HR", "Graphic", "Academic", "Finance", "Marketing", "Legal", "Transport", "Operations", "Admin"
  ];

  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
    department: "all",
    branch: "all",
  });
  const [page, setPage] = useState(1);
  const [dbBranches, setDbBranches] = useState([]);

  // ── Recycle Bin state ────────────────────────────────
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [recycleBinLoading, setRecycleBinLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [restoreBanner, setRestoreBanner] = useState(null); // { type: 'success'|'error', message: '' }

  useEffect(() => {
    const fetchB = async () => {
      try {
        const res = await getBranches();
        if (res?.data?.success) {
          setDbBranches(res.data.data);
        }
      } catch (e) {
        console.error("Failed to fetch branches in Tasks:", e);
      }
    };
    fetchB();
  }, []);

  const canManage = ["admin", "department-head", "branch-head"].includes(user?.role);
  const canAssign = ["admin", "department-head", "branch-head", "hr"].includes(user?.role);

  const load = () => {
    dispatch(
      fetchTasks({
        page,
        limit: 10,
        search: filters.search,
        status: filters.status,
        priority: filters.priority,
        department: filters.department,
        branch: filters.branch,
      }),
    );
    dispatch(fetchDashboardStats({
      department: filters.department !== "all" ? filters.department : undefined,
      branch: filters.branch !== "all" ? filters.branch : undefined,
    }));
  };

  // Reload data when filters or page changes
  useEffect(() => {
    load();
  }, [
    page,
    filters.status,
    filters.priority,
    filters.department,
    filters.branch,
  ]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else load();
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Read URL search query param if present on mount to interlink from Email Center
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get("search");
    if (searchParam) {
      setFilters((prev) => ({ ...prev, search: searchParam }));
    }
  }, []);

  // Clamp filter options to user's authorized scope
  useEffect(() => {
    if (!user?.role) return;
    setFilters((prev) => {
      const next = { ...prev };
      if (!["admin", "it"].includes(user.role)) {
        if (user.branch) next.branch = user.branch;
      }
      if (user.role === "department-head" && user.department)
        next.department = user.department;
      if (user.role === "hr") next.department = "HR";
      return next;
    });
  }, [user?.role, user?.branch, user?.department]);

  // Auto-dismiss banner after 3s
  useEffect(() => {
    if (!restoreBanner) return;
    const t = setTimeout(() => setRestoreBanner(null), 3500);
    return () => clearTimeout(t);
  }, [restoreBanner]);

  const stats = useMemo(() => {
    const apiStats = dashboardStats?.summary || {};
    return {
      total: pagination.total || apiStats.totalTasks || 0,
      pending: apiStats.pendingTasks || 0,
      inProgress: apiStats.inProgressTasks || 0,
      submitted: apiStats.submittedTasks || 0,
      approved: (apiStats.completedTasks || 0),
    };
  }, [pagination.total, dashboardStats]);

  const setF = (k, v) => {
    setFilters((p) => ({ ...p, [k]: v }));
    setPage(1);
  };

  const branchFilterOptions = (() => {
    if (!user?.role) return ["all", ...BRANCHES];
    if (["admin", "it"].includes(user.role)) return ["all", ...BRANCHES];
    return [user.branch].filter(Boolean);
  })();

  const deptFilterOptions = useMemo(() => {
    let baseDepts = DEPTS;
    if (filters.branch !== "all") {
      const branchObj = dbBranches.find(b => b.name === filters.branch);
      if (branchObj && branchObj.departments && branchObj.departments.length > 0) {
        baseDepts = branchObj.departments.filter(dept => DEPTS.includes(dept));
      } else if (filters.branch !== "Central Gaurabagh" && filters.branch !== "Gaurabagh") {
        baseDepts = DEPTS.filter((d) => d === "Admin" || d === "Academic");
      }
    }
    if (!user?.role) return ["all", ...baseDepts];
    if (["admin", "it"].includes(user.role)) return ["all", ...baseDepts];
    if (user.role === "department-head") {
      const allowed = baseDepts.includes(user.department);
      return allowed ? [user.department] : [];
    }
    if (user.role === "hr") {
      const allowed = baseDepts.includes("HR");
      return allowed ? ["HR"] : [];
    }
    return ["all", ...baseDepts];
  }, [filters.branch, DEPTS, user, dbBranches]);

  useEffect(() => {
    if (filters.department !== "all" && !deptFilterOptions.includes(filters.department)) {
      setFilters((p) => ({ ...p, department: "all" }));
      setPage(1);
    }
  }, [filters.branch, deptFilterOptions, filters.department]);

  // ── Recycle Bin handlers ─────────────────────────────
  const handleOpenRecycleBin = useCallback(async () => {
    setShowRecycleBin(true);
    setRecycleBinLoading(true);
    try {
      const res = await getDeletedTasks();
      if (res?.data?.success) {
        setDeletedTasks(res.data.data || []);
      }
    } catch (err) {
      setRestoreBanner({ type: "error", message: "Failed to load deleted tasks." });
    } finally {
      setRecycleBinLoading(false);
    }
  }, []);

  const handleCloseRecycleBin = useCallback(() => {
    setShowRecycleBin(false);
    setDeletedTasks([]);
  }, []);

  const handleRestore = useCallback(async (taskId, taskTitle) => {
    setRestoringId(taskId);
    try {
      await restoreTask(taskId);
      setDeletedTasks((prev) => prev.filter((t) => t._id !== taskId));
      setRestoreBanner({ type: "success", message: `✅ "${taskTitle}" has been restored successfully.` });
      load(); // Refresh the active tasks grid
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to restore task.";
      setRestoreBanner({ type: "error", message: `❌ ${msg}` });
    } finally {
      setRestoringId(null);
    }
  }, []);

  const formatDeletedDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-4 md:p-6 antialiased">

      {/* ── Floating Banner Notification ─────────────── */}
      <AnimatePresence>
        {restoreBanner && (
          <motion.div
            key="restore-banner"
            initial={{ opacity: 0, y: -24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[999] px-5 py-3 rounded-2xl shadow-xl border text-sm font-semibold flex items-center gap-2.5 whitespace-nowrap ${
              restoreBanner.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {restoreBanner.message}
            <button
              onClick={() => setRestoreBanner(null)}
              className="ml-1 text-inherit opacity-60 hover:opacity-100 transition text-base leading-none"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📋 Tasks</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {user?.name} · {user?.role?.replace("-", " ")} · {user?.branch}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => load()}
            className="px-3 py-2 text-sm bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition font-medium text-slate-600 shadow-sm"
          >
            🔄 Refresh
          </button>
          {canAssign && (
            <>
              <button
                onClick={handleOpenRecycleBin}
                className="px-3 py-2 text-sm bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition font-medium text-slate-600 hover:text-red-600 shadow-sm flex items-center gap-1.5"
              >
                🗑️ <span className="hidden sm:inline">Deleted Tasks</span>
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm shadow-blue-500/20"
              >
                + Assign Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Stat Cards (Premium Glassmorphic Overhaul) ─ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {STAT_META.map((s) => (
          <div
            key={s.l}
            className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3 border-l-4 ${s.accent} hover:shadow-md transition-shadow`}
          >
            <div className={`${s.iconBg} w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-none">
                {s.l}
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5 leading-none">
                {stats[s.key]}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          <input
            value={filters.search}
            onChange={(e) => setF("search", e.target.value)}
            className="col-span-2 sm:col-span-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-slate-50 placeholder-slate-400"
            placeholder="🔍 Search tasks..."
          />
          {[
            {
              k: "status",
              opts: ["all", "pending", "in-progress", "submitted", "approved", "rejected"],
            },
            { k: "priority", opts: ["all", "low", "medium", "high", "urgent"] },
            { k: "department", opts: deptFilterOptions },
            { k: "branch", opts: branchFilterOptions },
          ].map(({ k, opts }) => (
            <select
              key={k}
              value={filters[k]}
              onChange={(e) => setF(k, e.target.value)}
              disabled={
                (k === "branch" &&
                  !["admin", "it"].includes(user?.role) &&
                  branchFilterOptions.length === 1) ||
                (k === "department" && user?.role === "department-head")
              }
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 capitalize disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {opts.map((o) => (
                <option key={o} value={o} className="capitalize">
                  {o === "all" ? `All ${k}s` : o}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {/* ── Pagination info & clear ───────────────────── */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing page <strong>{pagination.page}</strong> of{" "}
          <strong>{pagination.pages}</strong> ({pagination.total} total tasks)
        </span>
        {Object.values(filters).some((v) => v !== "all" && v !== "") && (
          <button
            onClick={() => {
              setFilters({
                search: "",
                status: "all",
                priority: "all",
                department: "all",
                branch: "all",
              });
              setPage(1);
            }}
            className="text-blue-600 hover:underline font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Task list ────────────────────────────────── */}
      {loading && allTasks.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div>
        </div>
      ) : allTasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-slate-500 font-medium">No tasks found</p>
          <p className="text-slate-400 text-sm mt-1">
            {Object.values(filters).some((v) => v !== "all" && v !== "")
              ? "Try clearing your filters"
              : "No tasks assigned yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {allTasks.map((t) => (
            <TaskCard key={t._id} task={t} onUpdate={load} />
          ))}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────── */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-xl text-sm bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
          >
            ◀
          </button>
          {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
            const totalP = pagination.pages;
            let p =
              totalP <= 5
                ? i + 1
                : page <= 3
                  ? i + 1
                  : page >= totalP - 2
                    ? totalP - 4 + i
                    : page - 2 + i;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-xl text-sm transition ${page === p ? "bg-blue-600 text-white font-bold shadow-sm" : "bg-white border border-slate-200 hover:bg-slate-50"}`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="px-3 py-1.5 rounded-xl text-sm bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
          >
            ▶
          </button>
        </div>
      )}

      {/* ── Create Task Modal ─────────────────────────── */}
      <CreateTaskModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onTaskCreated={load}
      />

      {/* ── Recycle Bin Modal ─────────────────────────── */}
      <AnimatePresence>
        {showRecycleBin && (
          <motion.div
            key="recycle-bin-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[98] antialiased"
            onClick={(e) => { if (e.target === e.currentTarget) handleCloseRecycleBin(); }}
          >
            <motion.div
              key="recycle-bin-panel"
              initial={{ opacity: 0, scale: 0.97, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 20 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden text-slate-800"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    🗑️ Deleted Tasks Archive
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Soft-deleted tasks — restore them to the active task board
                  </p>
                </div>
                <button
                  onClick={handleCloseRecycleBin}
                  className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition text-sm"
                  aria-label="Close Recycle Bin"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {recycleBinLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Loading deleted tasks...</p>
                  </div>
                ) : deletedTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <p className="text-5xl">🗑️</p>
                    <p className="text-slate-600 font-semibold">Recycle bin is empty</p>
                    <p className="text-xs text-slate-400">No soft-deleted tasks found in the system</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Task Title
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">
                          Priority
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">
                          Department
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                          Deleted
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deletedTasks.map((task) => {
                        const priority = task.priority || "medium";
                        const isRestoring = restoringId === task._id;
                        return (
                          <motion.tr
                            key={task._id}
                            layout
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            {/* Title */}
                            <td className="px-5 py-3.5">
                              <p className="font-semibold text-slate-800 truncate max-w-[180px] sm:max-w-[220px]">
                                {task.title}
                              </p>
                              {task.department && (
                                <p className="text-[10px] text-slate-400 mt-0.5 sm:hidden">{task.department}</p>
                              )}
                            </td>
                            {/* Priority */}
                            <td className="px-4 py-3.5 hidden sm:table-cell">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOTS[priority] || PRIORITY_DOTS.medium}`} />
                                {priority.charAt(0).toUpperCase() + priority.slice(1)}
                              </span>
                            </td>
                            {/* Department */}
                            <td className="px-4 py-3.5 hidden md:table-cell">
                              <span className="text-slate-600 text-xs font-medium">
                                {task.department || "—"}
                              </span>
                            </td>
                            {/* Deleted At */}
                            <td className="px-4 py-3.5 hidden lg:table-cell">
                              <span className="text-slate-400 text-xs">
                                {formatDeletedDate(task.deletedAt)}
                              </span>
                            </td>
                            {/* Restore Action */}
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={() => handleRestore(task._id, task.title)}
                                disabled={isRestoring}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 hover:text-emerald-800 text-xs font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
                              >
                                {isRestoring ? (
                                  <>
                                    <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                    Restoring…
                                  </>
                                ) : (
                                  <>🔄 Restore</>
                                )}
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/80 flex-shrink-0">
                <span className="text-xs text-slate-500 font-medium">
                  {deletedTasks.length} deleted task{deletedTasks.length !== 1 ? "s" : ""} in archive
                </span>
                <button
                  onClick={handleCloseRecycleBin}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-sm font-semibold text-slate-700 transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
