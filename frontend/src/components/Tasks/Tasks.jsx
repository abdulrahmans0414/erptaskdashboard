import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTasks, setPollingStatus, fetchDashboardStats } from "../../store/features/tasks";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import TaskCard from "./TaskCard";
import CreateTaskModal from "./CreateTaskModal";

import { useSettings } from "../../context/SettingsContext";

export default function Tasks() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const { items: allTasks, pagination, loading, dashboardStats } = useSelector((s) => s.tasks);

  const BRANCHES = settings?.branches || ["Gaurabagh"];
  const DEPTS = settings?.departments || ["IT"];

  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
    department: "all",
    branch: "all",
  });
  const [page, setPage] = useState(1);
  const canManage = ["admin", "department-head", "branch-head"].includes(
    user?.role,
  );
  const canAssign = ["admin", "department-head", "branch-head", "hr"].includes(
    user?.role,
  );

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

  // Note: For full stats counters, we would ideally use the dashboardStats or a separate summary API.
  // For now, keeping these as current-page stats or using the total from pagination.
  const STAT_CARDS = [
    { l: "Total", v: stats.total, c: "text-gray-700", bg: "bg-gray-50" },
    { l: "Pending", v: stats.pending, c: "text-amber-600", bg: "bg-amber-50" },
    { l: "In Progress", v: stats.inProgress, c: "text-blue-600", bg: "bg-blue-50" },
    { l: "Submitted", v: stats.submitted, c: "text-purple-600", bg: "bg-purple-50" },
    { l: "Completed", v: stats.approved, c: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const setF = (k, v) => {
    setFilters((p) => ({ ...p, [k]: v }));
    setPage(1);
  };

  const branchFilterOptions = (() => {
    if (!user?.role) return ["all", ...BRANCHES];
    if (["admin", "it"].includes(user.role)) return ["all", ...BRANCHES];
    // Scoped roles should not filter other branches
    return [user.branch].filter(Boolean);
  })();

  const deptFilterOptions = (() => {
    if (!user?.role) return ["all", ...DEPTS];
    if (["admin", "it"].includes(user.role)) return ["all", ...DEPTS];
    if (user.role === "department-head")
      return [user.department].filter(Boolean);
    if (user.role === "hr") return ["HR"];
    return ["all", ...DEPTS];
  })();

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Tasks</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {user?.name} · {user?.role?.replace("-", " ")} · {user?.branch}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load()}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl transition font-medium text-gray-600"
          >
            🔄 Refresh
          </button>
          {canAssign && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm shadow-blue-500/20"
            >
              + Assign Task
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {STAT_CARDS.map((s) => (
          <div
            key={s.l}
            className={`${s.bg} rounded-2xl p-3 text-center border border-gray-100`}
          >
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
              {s.l}
            </p>
            <p className={`text-2xl font-bold mt-0.5 ${s.c}`}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Team overview removed (as requested) */}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          <input
            value={filters.search}
            onChange={(e) => setF("search", e.target.value)}
            className="col-span-2 sm:col-span-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            placeholder="🔍 Search tasks..."
          />
          {[
            {
              k: "status",
              opts: [
                "all",
                "pending",
                "in-progress",
                "submitted",
                "approved",
                "rejected",
              ],
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
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
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

      {/* Count */}
      <div className="flex items-center justify-between text-xs text-gray-500">
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

      {/* Task list */}
      {loading && allTasks.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div>
        </div>
      ) : allTasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500 font-medium">No tasks found</p>
          <p className="text-gray-400 text-sm mt-1">
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

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-xl text-sm bg-white border disabled:opacity-40 hover:bg-gray-50 transition"
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
                className={`w-9 h-9 rounded-xl text-sm transition ${page === p ? "bg-blue-600 text-white font-bold shadow-sm" : "bg-white border hover:bg-gray-50"}`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="px-3 py-1.5 rounded-xl text-sm bg-white border disabled:opacity-40 hover:bg-gray-50 transition"
          >
            ▶
          </button>
        </div>
      )}

      <CreateTaskModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onTaskCreated={load}
      />
    </div>
  );
}
