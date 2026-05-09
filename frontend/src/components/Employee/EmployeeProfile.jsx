import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTasks,
  updateUser,
  getUserById,
  getUsersByBranch,
  getUsersByDepartment,
  uploadAvatar,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
  .replace(/\/api\/?$/, "");

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const BRANCHES = [
  "Gaurabagh",
  "Vikas Nagar",
  "Kalyanpur",
  "Kursi",
  "Hive",
  "Ring Road",
  "Muazzam Nagar",
  "Aziz Nagar",
];

const DEPARTMENTS = [
  "IT",
  "HR",
  "Graphic",
  "Academic",
  "Finance",
  "Marketing",
  "Legal",
  "Transport",
  "Operations",
];

const ROLES = [
  "admin",
  "department-head",
  "hr",
  "it",
  "graphic",
  "employee",
  "branch-head",
];

const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  "in-progress": "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  submitted: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  approved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const PRIORITY_BADGE = {
  low: "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
  medium: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  high: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  urgent: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

const ROLE_PILL = {
  admin: "bg-purple-100 text-purple-700",
  "branch-head": "bg-indigo-100 text-indigo-700",
  "department-head": "bg-blue-100 text-blue-700",
  hr: "bg-pink-100 text-pink-700",
  it: "bg-cyan-100 text-cyan-700",
  graphic: "bg-fuchsia-100 text-fuchsia-700",
  employee: "bg-slate-100 text-slate-700",
};

/* ------------------------------------------------------------------ */
/*  Reusable bits                                                      */
/* ------------------------------------------------------------------ */
const Toast = ({ toast }) =>
  toast ? (
    <div
      className={`fixed bottom-5 right-5 z-[60] px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-medium animate-[slideUp_.3s_ease-out] ${
        toast.type === "success"
          ? "bg-gradient-to-r from-emerald-500 to-green-600"
          : "bg-gradient-to-r from-rose-500 to-red-600"
      }`}
    >
      {toast.message}
    </div>
  ) : null;

const SkeletonCard = ({ className = "" }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />
);

const StatCard = ({ label, value, accent, onClick, active }) => (
  <button
    onClick={onClick}
    className={`group bg-white rounded-xl p-3 border text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 ${
      active
        ? "ring-2 ring-blue-500 border-blue-300 shadow-md"
        : "border-slate-200 hover:border-blue-300"
    }`}
  >
    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
      {label}
    </p>
    <p className={`text-xl font-bold mt-1 ${accent || "text-slate-800"}`}>
      {value}
    </p>
  </button>
);

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [employee, setEmployee] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [userRole, setUserRole] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [departmentStats, setDepartmentStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    avgCompletionRate: 0,
  });

  const [taskFilter, setTaskFilter] = useState("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    department: "",
    branch: "",
    role: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // /profile route may not have id - fallback to current user
  const effectiveId = id || currentUser?._id || currentUser?.id;

  useEffect(() => {
    if (effectiveId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveId, currentUser]);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      setUserRole(currentUser?.role || null);

      const [empRes, tasksRes] = await Promise.all([
        getUserById(effectiveId),
        getTasks(),
      ]);

      const emp = empRes.data?.data;
      const allTasks = tasksRes.data?.data || [];

      if (!emp) {
        setEmployee(null);
        setLoading(false);
        return;
      }

      setEmployee(emp);
      setProfileImage(emp.avatar || null);

      const empTasks = allTasks.filter((task) => {
        const assignedToId = task.assignedTo?._id || task.assignedTo;
        const taskAssignedId =
          typeof assignedToId === "string"
            ? assignedToId
            : assignedToId?.toString();
        return taskAssignedId === emp._id?.toString();
      });
      setTasks(empTasks);

      // Team members: fetch scoped list (works for branch-head / dept-head too)
      let team = [];
      if (currentUser?.role === "branch-head" && emp.branch) {
        const r = await getUsersByBranch(emp.branch);
        team = r.data?.data || [];
      } else if (currentUser?.role === "department-head" && emp.department) {
        const r = await getUsersByDepartment(emp.department);
        team = r.data?.data || [];
      } else {
        // For admin/it/hr: we don't have a generic "get all users" always permitted.
        // Keep team empty unless manager endpoints available.
        team = [];
      }

      const sameTeam = team.filter(
        (u) =>
          u.department === emp.department &&
          u.branch === emp.branch &&
          u._id !== emp._id &&
          u._id?.toString() !== emp._id?.toString() &&
          u.role !== "admin",
      );
      setTeamMembers(sameTeam);

      const deptTasks = allTasks.filter(
        (t) => t.department === emp.department && t.branch === emp.branch,
      );
      const deptCompleted = deptTasks.filter(
        (t) => t.status === "completed" || t.status === "approved",
      ).length;
      setDepartmentStats({
        totalTasks: deptTasks.length,
        completedTasks: deptCompleted,
        avgCompletionRate:
          deptTasks.length > 0
            ? ((deptCompleted / deptTasks.length) * 100).toFixed(0)
            : 0,
      });
    } catch (error) {
      console.error("Error:", error);
      showToast("Failed to load profile data", "error");
    }
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be less than 2MB", "error");
      return;
    }
    try {
      setAvatarUploading(true);
      const fd = new FormData();
      fd.append("avatar", file);
      const r = await uploadAvatar(effectiveId, fd);
      const avatarPath = r.data?.data?.avatar;
      if (avatarPath) {
        setProfileImage(avatarPath);
        setEmployee((prev) => (prev ? { ...prev, avatar: avatarPath } : prev));
      }
      showToast("Profile image updated!", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Avatar upload failed", "error");
    } finally {
      setAvatarUploading(false);
      // allow re-select same file
      e.target.value = "";
    }
  };

  const handleEditClick = () => {
    setEditForm({
      name: employee.name || "",
      email: employee.email || "",
      department: employee.department || "IT",
      branch: employee.branch || "Gaurabagh",
      role: employee.role || "employee",
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const response = await updateUser(employee._id, editForm);
      if (response.data.success) {
        showToast("Profile updated successfully", "success");
        setShowEditModal(false);
        await loadData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Update failed", "error");
    }
    setEditLoading(false);
  };

  /* ---------------- Derived stats ---------------- */
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(
      (t) => t.status === "completed" || t.status === "approved",
    ).length;
    const inProgress = tasks.filter((t) => t.status === "in-progress").length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const submitted = tasks.filter((t) => t.status === "submitted").length;
    const rejected = tasks.filter((t) => t.status === "rejected").length;
    const overdue = tasks.filter(
      (t) =>
        t.status !== "completed" &&
        t.status !== "approved" &&
        new Date(t.dueDate) < new Date(),
    ).length;
    const rate = total > 0 ? ((completed / total) * 100).toFixed(0) : 0;
    return {
      total,
      completed,
      inProgress,
      pending,
      submitted,
      rejected,
      overdue,
      rate,
    };
  }, [tasks]);

  const displayedTasks = useMemo(() => {
    let result = tasks;
    if (taskFilter !== "all") {
      if (taskFilter === "overdue") {
        result = result.filter(
          (t) =>
            t.status !== "completed" &&
            t.status !== "approved" &&
            new Date(t.dueDate) < new Date(),
        );
      } else {
        result = result.filter((t) => t.status === taskFilter);
      }
    }
    if (taskSearch.trim()) {
      const q = taskSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [tasks, taskFilter, taskSearch]);

  const completedTasksList = tasks.filter(
    (t) => t.status === "completed" || t.status === "approved",
  );

  const statusChartData = {
    labels: ["Pending", "In Progress", "Submitted", "Completed", "Rejected"],
    datasets: [
      {
        data: [
          stats.pending,
          stats.inProgress,
          stats.submitted,
          stats.completed,
          stats.rejected,
        ],
        backgroundColor: [
          "#f59e0b",
          "#3b82f6",
          "#a855f7",
          "#10b981",
          "#ef4444",
        ],
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 10, font: { size: 11 }, padding: 12 },
      },
    },
  };

  const statusFilters = [
    { key: "all", label: "All", count: stats.total },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "in-progress", label: "In Progress", count: stats.inProgress },
    { key: "submitted", label: "Submitted", count: stats.submitted },
    { key: "completed", label: "Completed", count: stats.completed },
    { key: "rejected", label: "Rejected", count: stats.rejected },
    { key: "overdue", label: "Overdue", count: stats.overdue },
  ];

  /* ---------------- Loading skeleton ---------------- */
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 space-y-5">
        <SkeletonCard className="h-40" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonCard key={i} className="h-20" />
          ))}
        </div>
        <SkeletonCard className="h-20" />
        <SkeletonCard className="h-64" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-4xl mb-4">
          🔍
        </div>
        <h2 className="text-xl font-bold text-slate-800">Employee not found</h2>
        <p className="text-slate-500 text-sm mt-1">
          The profile you're looking for doesn't exist or was removed.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30">
      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn .4s ease-out; }
        .animate-scale-in { animation: scaleIn .3s ease-out; }
      `}</style>

      <Toast toast={toast} />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5 animate-fade-in">
        {/* ---------------- Profile Header ---------------- */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-5 sm:p-7 text-white shadow-xl">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-purple-300/20 rounded-full blur-3xl" />

          <button
            onClick={() => navigate(-1)}
            className="relative mb-4 inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-all hover:gap-2"
          >
            <span>←</span> Back
          </button>

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative group flex-shrink-0 mx-auto sm:mx-0">
              {profileImage ? (
                <img
                  src={
                    profileImage.startsWith("http")
                      ? profileImage
                      : `${API_ORIGIN}${profileImage}`
                  }
                  alt={employee.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-white/30 shadow-2xl"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl font-bold ring-4 ring-white/30 shadow-2xl">
                  {employee.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <button
                onClick={() =>
                  document.getElementById("profileImageInput").click()
                }
                className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-600 shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                title="Change photo"
              >
                📷
              </button>
              <input
                id="profileImageInput"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-2xl sm:text-3xl font-bold truncate">
                  {employee.name}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm capitalize">
                  {employee.role}
                </span>
              </div>
              <p className="opacity-90 text-sm mt-1 truncate">
                {employee.email}
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs opacity-80 justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1">
                  🏢 {employee.department}
                </span>
                <span className="inline-flex items-center gap-1">
                  📍 {employee.branch}
                </span>
                <span className="inline-flex items-center gap-1 font-mono">
                  ID: {employee.employeeId || employee._id?.slice(-6)}
                </span>
              </div>
            </div>

            {userRole === "admin" && (
              <div className="flex sm:flex-col gap-2 flex-shrink-0 justify-center">
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-center">
                  👑 Admin View
                </span>
                <button
                  onClick={handleEditClick}
                  className="bg-white text-blue-700 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-50 transition shadow-md hover:shadow-lg"
                >
                  ✏️ Edit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ---------------- Stats Cards ---------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
          {[
            { label: "Total", value: stats.total, key: "all" },
            {
              label: "Completed",
              value: stats.completed,
              accent: "text-emerald-600",
              key: "completed",
            },
            {
              label: "Progress",
              value: stats.inProgress,
              accent: "text-blue-600",
              key: "in-progress",
            },
            {
              label: "Pending",
              value: stats.pending,
              accent: "text-amber-600",
              key: "pending",
            },
            {
              label: "Submitted",
              value: stats.submitted,
              accent: "text-violet-600",
              key: "submitted",
            },
            {
              label: "Rejected",
              value: stats.rejected,
              accent: "text-rose-600",
              key: "rejected",
            },
            {
              label: "Overdue",
              value: stats.overdue,
              accent: "text-orange-600",
              key: "overdue",
            },
          ].map((s) => (
            <StatCard
              key={s.key}
              label={s.label}
              value={s.value}
              accent={s.accent}
              active={selectedTab === "tasks" && taskFilter === s.key}
              onClick={() => {
                setTaskFilter(s.key);
                setSelectedTab("tasks");
              }}
            />
          ))}
        </div>

        {/* ---------------- Completion Rate Bar ---------------- */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Overall Completion Rate
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {stats.completed} of {stats.total} tasks completed
              </p>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">
              {stats.rate}%
            </p>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out shadow-sm"
              style={{ width: `${stats.rate}%` }}
            />
          </div>
        </div>

        {/* ---------------- Tabs ---------------- */}
        <div className="bg-white rounded-xl p-1.5 shadow-sm border border-slate-200 flex gap-1 overflow-x-auto">
          {[
            { key: "overview", label: "Overview", icon: "📊" },
            { key: "charts", label: "Charts", icon: "📈" },
            { key: "tasks", label: `Tasks (${stats.total})`, icon: "📋" },
            {
              key: "history",
              label: `History (${stats.completed})`,
              icon: "✅",
            },
            { key: "team", label: `Team (${teamMembers.length})`, icon: "👥" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={`flex-1 sm:flex-none px-4 py-2 font-medium whitespace-nowrap text-sm transition-all rounded-lg ${
                selectedTab === tab.key
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ---------------- Overview Tab ---------------- */}
        {selectedTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm">
                  📊
                </span>
                Performance
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Completion Rate</span>
                  <span className="font-bold text-emerald-600">
                    {stats.rate}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-green-600 rounded-full transition-all duration-700"
                    style={{ width: `${stats.rate}%` }}
                  />
                </div>
                {[
                  { l: "Pending", v: stats.pending, c: "text-amber-600" },
                  { l: "In Progress", v: stats.inProgress, c: "text-blue-600" },
                  { l: "Submitted", v: stats.submitted, c: "text-violet-600" },
                  { l: "Rejected", v: stats.rejected, c: "text-rose-600" },
                ].map((r) => (
                  <div
                    key={r.l}
                    className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-slate-500">{r.l}</span>
                    <span className={`font-bold ${r.c}`}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm">
                  🏢
                </span>
                Information
              </h3>
              <div className="space-y-2.5 text-sm">
                {[
                  ["Department", employee.department],
                  ["Branch", `📍 ${employee.branch}`],
                  [
                    "Role",
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_PILL[employee.role] || "bg-slate-100 text-slate-700"}`}
                    >
                      {employee.role}
                    </span>,
                  ],
                  [
                    "Status",
                    <span className="text-emerald-600 font-medium inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                      Active
                    </span>,
                  ],
                  [
                    "Email",
                    <span className="text-xs truncate max-w-[180px]">
                      {employee.email}
                    </span>,
                  ],
                  ...(employee.employeeId
                    ? [
                        [
                          "ID",
                          <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">
                            {employee.employeeId}
                          </span>,
                        ],
                      ]
                    : []),
                  ["Since", new Date(employee.createdAt).toLocaleDateString()],
                ].map(([k, v], i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-slate-500">{k}</span>
                    <span className="font-medium text-slate-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 lg:col-span-2">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm">
                  🏢
                </span>
                {employee.department} – {employee.branch}
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  {
                    label: "Dept Tasks",
                    value: departmentStats.totalTasks,
                    gradient: "from-blue-50 to-indigo-50",
                    text: "text-blue-600",
                  },
                  {
                    label: "Completed",
                    value: departmentStats.completedTasks,
                    gradient: "from-emerald-50 to-green-50",
                    text: "text-emerald-600",
                  },
                  {
                    label: "Avg Rate",
                    value: `${departmentStats.avgCompletionRate}%`,
                    gradient: "from-purple-50 to-pink-50",
                    text: "text-purple-600",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`bg-gradient-to-br ${s.gradient} p-4 rounded-xl`}
                  >
                    <p className="text-xs text-slate-500 font-medium">
                      {s.label}
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${s.text}`}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                <span className="text-slate-600">vs Department Average</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    Number(stats.rate) >=
                    Number(departmentStats.avgCompletionRate)
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                  }`}
                >
                  {Number(stats.rate) >=
                  Number(departmentStats.avgCompletionRate)
                    ? "📈 Above Average"
                    : "📉 Below Average"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Charts Tab ---------------- */}
        {selectedTab === "charts" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-4 text-center">
                📊 Task Status Distribution
              </h3>
              <div className="h-64 flex items-center justify-center">
                {stats.total > 0 ? (
                  <Doughnut data={statusChartData} options={doughnutOptions} />
                ) : (
                  <p className="text-slate-400 text-sm">No tasks yet</p>
                )}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-4 text-center">
                📈 Completion Rate
              </h3>
              <div className="flex flex-col items-center justify-center h-64">
                <div className="relative">
                  <p className="text-6xl font-bold bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">
                    {stats.rate}%
                  </p>
                </div>
                <p className="text-sm text-slate-500 mt-3">
                  {stats.completed} of {stats.total} tasks
                </p>
                <div className="w-full max-w-xs mt-5">
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-green-600 rounded-full transition-all duration-1000"
                      style={{ width: `${stats.rate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Tasks Tab ---------------- */}
        {selectedTab === "tasks" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
              <input
                type="text"
                placeholder="🔍 Search tasks..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
              />
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setTaskFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      taskFilter === f.key
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                        : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {f.label}
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        taskFilter === f.key ? "bg-white/30" : "bg-white"
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {displayedTasks.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-3xl mb-3">
                  📋
                </div>
                <p className="text-slate-600 font-medium">
                  No {taskFilter !== "all" ? taskFilter : ""} tasks found
                </p>
                {taskSearch && (
                  <p className="text-slate-400 text-sm mt-1">
                    Try a different search term
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {displayedTasks.map((task, i) => (
                  <div
                    key={task._id}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all animate-fade-in"
                    style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-800 text-sm">
                        {task.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[task.status] || "bg-slate-50 text-slate-600"}`}
                      >
                        {task.status}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority] || "bg-slate-50 text-slate-600"}`}
                      >
                        {task.priority}
                      </span>
                      {task.isTeamTask && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full ring-1 ring-blue-200">
                          👥 Team
                        </span>
                      )}
                      {new Date(task.dueDate) < new Date() &&
                        task.status !== "completed" &&
                        task.status !== "approved" && (
                          <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full ring-1 ring-rose-200 animate-pulse">
                            ⏰ Overdue
                          </span>
                        )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-slate-500 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                      <span>
                        📅 {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                      <span>📍 {task.branch}</span>
                      {task.estimatedHours > 0 && (
                        <span>
                          🎯 {task.estimatedHours}h {task.estimatedMinutes || 0}
                          m
                        </span>
                      )}
                    </div>
                    {task.submissionNote && (
                      <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="font-semibold">Note: </span>
                        {task.submissionNote}
                      </div>
                    )}
                    {task.adminComments && (
                      <div className="mt-2 text-xs bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                        <span className="font-semibold text-blue-700">
                          Feedback:{" "}
                        </span>
                        <span className="text-blue-900">
                          {task.adminComments}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------- History Tab ---------------- */}
        {selectedTab === "history" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-green-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-sm">
                  ✅
                </span>
                Completed Tasks ({completedTasksList.length})
              </h3>
            </div>
            {completedTasksList.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-3xl mb-3">
                  🏆
                </div>
                <p className="font-medium">No completed tasks yet</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                          Task
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                          Dept
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                          Priority
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                          Due
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                          Completed
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedTasksList.map((task) => (
                        <tr
                          key={task._id}
                          className="border-b border-slate-50 hover:bg-slate-50/60 transition"
                        >
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {task.title}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                              {task.department}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${PRIORITY_BADGE[task.priority] || "bg-slate-50 text-slate-600"}`}
                            >
                              {task.priority}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4 text-xs text-slate-500">
                            {new Date(task.dueDate).toLocaleDateString()}
                          </td>
                          <td className="text-center py-3 px-4 text-xs text-slate-500">
                            {task.completedAt
                              ? new Date(task.completedAt).toLocaleDateString()
                              : task.approvedAt
                                ? new Date(task.approvedAt).toLocaleDateString()
                                : "N/A"}
                          </td>
                          <td className="text-center py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${STATUS_BADGE[task.status]}`}
                            >
                              {task.status === "approved"
                                ? "✅ Approved"
                                : "✅ Done"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {completedTasksList.map((task) => (
                    <div key={task._id} className="p-4">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <p className="font-semibold text-slate-800 text-sm">
                          {task.title}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${STATUS_BADGE[task.status]}`}
                        >
                          {task.status === "approved" ? "Approved" : "Done"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          {task.department}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded ${PRIORITY_BADGE[task.priority]}`}
                        >
                          {task.priority}
                        </span>
                        <span className="text-slate-500">
                          📅 Due {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ---------------- Team Tab ---------------- */}
        {selectedTab === "team" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm">
                  👥
                </span>
                Team – {employee.department} ({employee.branch})
              </h3>
              {teamMembers.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <div className="text-4xl mb-2">🌟</div>
                  <p>No other team members in this department</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teamMembers.map((member, i) => (
                    <div
                      key={member._id}
                      onClick={() => navigate(`/employee/${member._id}`)}
                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:shadow-md hover:border-blue-300 transition-all cursor-pointer hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 animate-fade-in group"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                        {member.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">
                          {member.role}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          📍 {member.branch}
                        </p>
                      </div>
                      <span className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0">
                        →
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {teamMembers.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4">
                  📊 Team Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  {[
                    {
                      label: "Team Size",
                      value: teamMembers.length + 1,
                      gradient: "from-blue-50 to-indigo-50",
                      text: "text-blue-600",
                    },
                    {
                      label: "Total Tasks",
                      value: departmentStats.totalTasks,
                      gradient: "from-emerald-50 to-green-50",
                      text: "text-emerald-600",
                    },
                    {
                      label: "Avg Rate",
                      value: `${departmentStats.avgCompletionRate}%`,
                      gradient: "from-purple-50 to-pink-50",
                      text: "text-purple-600",
                    },
                    {
                      label: "Completed",
                      value: departmentStats.completedTasks,
                      gradient: "from-orange-50 to-amber-50",
                      text: "text-orange-600",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`bg-gradient-to-br ${s.gradient} p-4 rounded-xl`}
                    >
                      <p className="text-xs text-slate-500 font-medium">
                        {s.label}
                      </p>
                      <p className={`text-2xl font-bold mt-1 ${s.text}`}>
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- Edit Profile Modal ---------------- */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
              <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex justify-between items-center rounded-t-2xl">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm">
                    ✏️
                  </span>
                  Edit Profile
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 text-xl flex items-center justify-center transition"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                {[
                  { label: "Name", key: "name", type: "text", required: true },
                  {
                    label: "Email",
                    key: "email",
                    type: "email",
                    required: true,
                  },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {f.label}{" "}
                      {f.required && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type={f.type}
                      required={f.required}
                      value={editForm[f.key]}
                      onChange={(e) =>
                        setEditForm({ ...editForm, [f.key]: e.target.value })
                      }
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>
                ))}

                {[
                  {
                    label: "Department",
                    key: "department",
                    options: DEPARTMENTS,
                  },
                  { label: "Branch", key: "branch", options: BRANCHES },
                  { label: "Role", key: "role", options: ROLES },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {f.label}
                    </label>
                    <select
                      value={editForm[f.key]}
                      onChange={(e) =>
                        setEditForm({ ...editForm, [f.key]: e.target.value })
                      }
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition capitalize"
                    >
                      {f.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                  <p className="text-xs text-amber-800">
                    ⚠️ Changes will be saved to backend immediately.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:shadow-lg disabled:opacity-50 transition"
                  >
                    {editLoading ? "Saving..." : "💾 Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeProfile;
