import { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTasks, setPollingStatus, fetchDashboardStats } from "../../store/features/tasks";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
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

  const BRANCHES = useMemo(() => {
    return (dbBranches || []).length > 0
      ? dbBranches.map((b) => b?.name).filter(Boolean)
      : (settings?.branches || [
          "Central Gaurabagh", "Vikas Nagar", "Hive", "Hifz Academy", "Kursi Road", "Muazzam Nagar", "Aziz Nagar", "Mailaraiganj"
        ]);
  }, [dbBranches, settings]);
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

  // Deleted local Recycle Bin modal states

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



  return (
    <div className="max-w-6xl mx-auto space-y-5 p-4 md:p-6 antialiased">



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
              <Link
                to="/tasks/trash"
                className="px-3 py-2 text-sm bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition font-medium text-slate-600 hover:text-red-600 shadow-sm flex items-center gap-1.5"
              >
                🗑️ <span className="hidden sm:inline">Deleted Tasks</span>
              </Link>
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
      {showCreate && (
        <CreateTaskModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onTaskCreated={load}
        />
      )}


    </div>
  );
}
