import { useState, useEffect, useMemo, useRef } from "react";
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
import { useSettings } from "../../context/SettingsContext";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import toast from "react-hot-toast";

ChartJS.register(ArcElement, Tooltip, Legend);

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:5001/api"
).replace(/\/api\/?$/, "");

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
import { STATUS_BADGE, PRIORITY_BADGE, ROLE_PILL } from "../../utils/constants";
import EditProfileModal from "./Profile/EditProfileModal";
import ProfileHeader from "./Profile/ProfileHeader";

/* ------------------------------------------------------------------ */
/*  Reusable bits                                                      */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  Reusable bits                                                      */
/* ------------------------------------------------------------------ */
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
  // Destructure loading (auth) separately to detect hydration state
  const { user: currentUser, loading: authLoading, refreshUser } = useAuth();
  const { settings } = useSettings();
  const pollingRef = useRef(null);

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
  const [profileImage, setProfileImage] = useState(null);
  const [, setAvatarUploading] = useState(false);

  // /profile route may not have :id param — fall back to authenticated user's id.
  // NOTE: currentUser may be null during Redux auth hydration, so effectiveId
  // will be undefined until hydration completes. The useEffect below handles this.
  const effectiveId = id || currentUser?._id || currentUser?.id;

  const loadData = async () => {
    setLoading(true);
    try {
      setUserRole(currentUser?.role || null);

      const [empRes, tasksRes] = await Promise.all([
        getUserById(effectiveId),
        getTasks({ assignedTo: effectiveId, limit: 5000 }),
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

      const employeeId = emp._id?.toString();
      const empTasks = allTasks.filter((task) => {
        const assignedToId = task.assignedTo?._id || task.assignedTo;
        const assignedToString =
          typeof assignedToId === "string"
            ? assignedToId
            : assignedToId?.toString();

        const assignedTeamIds = (task.assignedTeam || []).map((member) =>
          typeof member === "string" ? member : member?._id?.toString(),
        );

        return (
          assignedToString === employeeId ||
          assignedTeamIds.includes(employeeId)
        );
      });
      setTasks(empTasks);

      // Team members: fetch scoped list based on role
      let team = [];
      if (currentUser?.role === "branch-head" && emp.branch) {
        const r = await getUsersByBranch(emp.branch);
        team = r.data?.data || [];
      } else if (currentUser?.role === "department-head" && emp.department) {
        const r = await getUsersByDepartment(emp.department, emp.branch); // branch-scoped
        team = r.data?.data || [];
      } else if ((currentUser?.role === "admin" || currentUser?.role === "it") && emp.branch) {
        // Admin/IT can see the full team of whoever's profile they're viewing
        const r = await getUsersByBranch(emp.branch);
        team = r.data?.data || [];
      } else {
        team = [];
      }

      const sameTeam = team.filter(
        (u) =>
          u.department === emp.department &&
          u.branch === emp.branch &&
          u._id !== emp._id &&
          u._id?.toString() !== emp._id?.toString(),
      );
      setTeamMembers(sameTeam);

      const deptTasks = allTasks.filter(
        (t) => t.department === emp.department && t.branch === emp.branch,
      );
      // For dept stats: if admin/IT, also fetch dept-wide tasks (not just this employee's)
      let deptAllTasks = deptTasks;
      if (
        (currentUser?.role === "admin" || currentUser?.role === "it" || currentUser?.role === "branch-head") &&
        emp.department && emp.branch
      ) {
        try {
          const deptRes = await getTasks({ department: emp.department, branch: emp.branch, limit: 5000 });
          deptAllTasks = deptRes.data?.data || deptTasks;
        } catch (e) {
          console.warn("Failed to fetch dept tasks:", e);
          deptAllTasks = deptTasks;
        }
      }
      const deptCompleted = deptAllTasks.filter(
        (t) => t.status === "completed" || t.status === "approved",
      ).length;
      setDepartmentStats({
        totalTasks: deptAllTasks.length,
        completedTasks: deptCompleted,
        avgCompletionRate:
          deptAllTasks.length > 0
            ? ((deptCompleted / deptAllTasks.length) * 100).toFixed(0)
            : 0,
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load profile data");
    }
    setLoading(false);
  };

  useEffect(() => {
    // Guard: if viewing /profile (no URL id), wait for auth hydration to complete.
    // If id comes from URL params, we can proceed immediately.
    // Adding currentUser to deps ensures re-fire when auth resolves from null → user.
    if (!effectiveId) return;

    const initialize = async () => {
      await loadData();
    };

    initialize();

    // Realtime polling: refresh profile + tasks every 30 seconds
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      if (!showEditModal) {
        loadData();
      }
    }, 30000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
    // Include currentUser in deps: when viewing /profile, effectiveId is derived
    // from currentUser which may be null during first-mount auth hydration.
    // Without currentUser here, the effect would fire once (returning early) and
    // never re-fire even after currentUser resolves — causing a blank/frozen page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveId, currentUser]);

  // Removed local showToast

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }
    try {
      setAvatarUploading(true);
      const fd = new FormData();
      fd.append("avatar", file);
      const r = await uploadAvatar(effectiveId, fd);
      if (r.data.success) {
        const avatarPath = r.data?.data?.avatar;
        if (avatarPath) {
          setProfileImage(avatarPath);
          setEmployee((prev) => (prev ? { ...prev, avatar: avatarPath } : prev));
        }
        toast.success("Profile image updated!");
      } else {
        toast.error(r.data.message || "Avatar upload failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Avatar upload failed");
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
      phone: employee.phone || "",
      dateOfJoining: employee.dateOfJoining || "",
      department: employee.department || "IT",
      branch: employee.branch || "Gaurabagh",
      role: employee.role || "employee",
      employeeId: employee.employeeId || "",
      customFields: employee.customFields || {},
      password: "", // Always start with empty password
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const response = await updateUser(employee._id, editForm);
      if (response.data.success) {
        toast.success("Profile updated successfully");
        setShowEditModal(false);
        await loadData();
        // If editing own profile, refresh auth context so header/sidebar updates
        const selfId = currentUser?._id?.toString() || currentUser?.id?.toString();
        if (effectiveId?.toString() === selfId) {
          await refreshUser();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
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
    // false = Chart.js fills its parent container exactly; prevents canvas
    // from overflowing its h-64 bounding box and overlapping nav panels.
    maintainAspectRatio: false,
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

  /* ---------------- Auth hydration guard ---------------- */
  // While auth is resolving (token exists but currentUser not yet fetched from API),
  // show the skeleton immediately. Without this, reading currentUser?.role etc. on
  // first paint causes "Cannot read properties of null" crashes.
  if (authLoading && !currentUser && !id) {
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

  /* ---------------- Data loading skeleton ---------------- */
  if (loading && !employee) {
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
    <div className="w-full text-slate-800 antialiased subpixel-antialiased">
      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn .4s ease-out; }
        .animate-scale-in { animation: scaleIn .3s ease-out; }
      `}</style>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5 animate-fade-in">
        {/* ---------------- Profile Header ---------------- */}
        <ProfileHeader
          employee={employee}
          profileImage={profileImage}
          handleImageUpload={handleImageUpload}
          userRole={userRole}
          effectiveId={effectiveId}
          currentUser={currentUser}
          handleEditClick={handleEditClick}
          API_ORIGIN={API_ORIGIN}
        />

        {/* ---------------- Stats Cards or Corporate Info Grid ---------------- */}
        {['admin', 'director'].includes(employee.role) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between hover-lift">
              <div>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">System Status</span>
                <p className="text-xl font-bold text-slate-800 mt-2">Active Administrator</p>
              </div>
              <span className="text-xs text-emerald-600 font-semibold mt-4 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Full Access Enabled
              </span>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between hover-lift">
              <div>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Branch Scope</span>
                <p className="text-xl font-bold text-slate-800 mt-2">{employee.branch || "All Branches"}</p>
              </div>
              <span className="text-xs text-slate-400 mt-4">Mapped Branch Assignment</span>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between hover-lift">
              <div>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Privilege Level</span>
                <p className="text-xl font-bold text-indigo-650 mt-2">Enterprise Superuser</p>
              </div>
              <span className="text-xs text-slate-400 mt-4">Role Authorization: {employee.role}</span>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between hover-lift">
              <div>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Join Date</span>
                <p className="text-xl font-bold text-slate-800 mt-2">
                  {new Date(employee.dateOfJoining || employee.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <span className="text-xs text-slate-400 mt-4">Registered System Member</span>
            </div>
          </div>
        ) : (
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
        )}

        {/* ---------------- Completion Rate Bar or Activity Timeline ---------------- */}
        {['admin', 'director'].includes(employee.role) ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span>📋</span> Administrative Activity Timeline
            </h4>
            <div className="relative border-l border-slate-200 ml-3.5 pl-6 space-y-5">
              <div className="relative">
                <span className="absolute -left-[30px] top-0.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-50 border border-white" />
                <p className="text-xs font-semibold text-slate-700">Account Initialized</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Profile registered under role: <span className="capitalize font-medium text-slate-650">{employee.role}</span>
                </p>
              </div>
              <div className="relative">
                <span className="absolute -left-[30px] top-0.5 w-3 h-3 rounded-full bg-purple-600 ring-4 ring-purple-50 border border-white" />
                <p className="text-xs font-semibold text-slate-700">Scope Mapping Complete</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Assigned to <span className="font-medium text-slate-650">{employee.department || "IT"}</span> department at branch <span className="font-medium text-slate-650">{employee.branch || "Gaurabagh"}</span>
                </p>
              </div>
              <div className="relative">
                <span className="absolute -left-[30px] top-0.5 w-3 h-3 rounded-full bg-slate-600 ring-4 ring-slate-100 border border-white" />
                <p className="text-xs font-semibold text-slate-700">Administrator Remarks</p>
                <p className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1.5 italic">
                  "{employee.adminComments || "No administrator notes have been recorded for this profile."}"
                </p>
              </div>
            </div>
          </div>
        ) : (
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
        )}

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
                  ...Object.entries(employee.customFields || {}).map(
                    ([key, val]) => {
                      const label =
                        settings?.userCustomFields?.find((f) => f.id === key)
                          ?.label || key;
                      return [label, val];
                    },
                  ),
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
              <div className="relative w-full h-64 max-h-[260px] overflow-hidden flex items-center justify-center">
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
                <div className="hidden md:block w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
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
        {/* ---------------- Edit Profile Modal ---------------- */}
        <EditProfileModal
          showEditModal={showEditModal}
          setShowEditModal={setShowEditModal}
          editForm={editForm}
          setEditForm={setEditForm}
          handleEditSubmit={handleEditSubmit}
          editLoading={editLoading}
          isAdmin={currentUser?.role === "admin"}
        />
      </div>
    </div>
  );
};

export default EmployeeProfile;
