import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTasks, fetchDashboardStats } from "../../store/features/tasks";
import {
  getUsers,
  getUsersByBranch,
  getUsersByDepartment,
  getEmployeeSummary,
  getBranches
} from "../../services/api";
import { reviewTask } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useNavigate } from "react-router-dom";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Filler,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Filler,
);

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:5001/api"
).replace(/\/api\/?$/, "");

// ==================== ANIMATIONS ====================
const animations = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
  .animate-fadeInUp { animation: fadeInUp 0.5s ease-out; }
  .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
  .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
  .animate-slideInRight { animation: slideInRight 0.3s ease-out; }
  .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  .skeleton { 
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 1000px 100%;
    animation: shimmer 2s infinite;
  }
  .stagger-1 { animation-delay: 0.05s; }
  .stagger-2 { animation-delay: 0.1s; }
  .stagger-3 { animation-delay: 0.15s; }
  .stagger-4 { animation-delay: 0.2s; }
  .stagger-5 { animation-delay: 0.25s; }
  .stagger-6 { animation-delay: 0.3s; }
  .hover-lift { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
  .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -8px rgba(0,0,0,0.15); }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a1a1a1; }
`;

import toast from "react-hot-toast";

// ==================== SKELETON LOADER ====================
const Skeleton = ({ className = "" }) => (
  <div className={`skeleton rounded-lg ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
    <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl p-6">
      <Skeleton className="h-6 w-48 bg-white/20 mb-2" />
      <Skeleton className="h-4 w-32 bg-white/20" />
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm border">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-48 w-full rounded-full" />
      </div>
    </div>

    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-xl border">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ==================== EMPLOYEE MINI CARD ====================
const EmployeeMiniCard = ({ emp, stats, onClick, index }) => {
  const colors = {
    IT: "from-blue-600 to-indigo-500 shadow-blue-100",
    HR: "from-pink-500 to-rose-500 shadow-pink-100",
    Graphic: "from-purple-500 to-violet-500 shadow-purple-100",
    Academic: "from-violet-600 to-indigo-600 shadow-violet-100",
    Finance: "from-emerald-500 to-teal-500 shadow-emerald-100",
    Marketing: "from-amber-500 to-orange-500 shadow-amber-100",
    Legal: "from-slate-600 to-slate-500 shadow-slate-100",
    Transport: "from-yellow-500 to-amber-500 shadow-yellow-100",
    Operations: "from-cyan-600 to-blue-500 shadow-cyan-100",
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white rounded-3xl border border-slate-100/80 p-5 hover:border-blue-200/80 hover:shadow-[0_20px_40px_rgba(59,130,246,0.06)] hover-lift cursor-pointer transition-all duration-300 animate-fadeInUp stagger-${(index % 6) + 1}`}
    >
      {/* Decorative hover gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/0 via-indigo-500/0 to-indigo-500/[0.02] rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Avatar Container */}
          <div className="relative flex-shrink-0">
            {emp.avatar ? (
              <img
                src={emp.avatar.startsWith("http") ? emp.avatar : `${API_ORIGIN}${emp.avatar}`}
                alt={emp.name}
                className="w-12 h-12 rounded-2xl object-cover shadow-sm ring-4 ring-slate-50 group-hover:ring-blue-50 transition-all duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = "";
                  e.currentTarget.removeAttribute("src");
                }}
              />
            ) : (
              <div
                className={`w-12 h-12 bg-gradient-to-br ${colors[emp.department] || "from-slate-500 to-slate-600"} rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shadow-md transition-all duration-300 group-hover:scale-105 group-hover:rotate-3`}
              >
                {getInitials(emp.name)}
              </div>
            )}
            {/* Online status dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
          </div>

          <div className="min-w-0">
            <h4 className="font-bold text-slate-800 text-sm tracking-tight truncate group-hover:text-blue-600 transition-colors duration-200">
              {emp.name}
            </h4>
            <span className="text-[10px] font-semibold text-slate-400 capitalize truncate block tracking-wide mt-0.5">
              {emp.role?.replace(/-/g, " ") || "Member"}
            </span>
          </div>
        </div>

        {/* Employee ID Badge */}
        <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50/30 group-hover:text-blue-600 transition-all duration-200 tracking-wider">
          #{emp.employeeId || "N/A"}
        </span>
      </div>

      {/* Info Panel: Email & Phone with SVG Icons */}
      <div className="space-y-2 mb-4 p-3 bg-slate-50/50 group-hover:bg-blue-50/10 rounded-2xl border border-slate-100/50 transition-all duration-300 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0 text-slate-500 group-hover:text-slate-600 transition-colors" title={emp.email}>
          <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-xs truncate font-medium">{emp.email || "No Email"}</span>
        </div>
        <div className="flex items-center gap-2.5 min-w-0 text-slate-500 group-hover:text-slate-600 transition-colors">
          <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span className="text-xs font-semibold tracking-wide">{emp.phone || "Not Provided"}</span>
        </div>
      </div>

      {/* Task Performance Grid with mini indicators */}
      <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
        <div className="bg-white group-hover:bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100/70 text-center transition-all duration-300">
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <p className="text-xs font-extrabold text-slate-700">{stats.completed}</p>
          </div>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Done</p>
        </div>
        <div className="bg-white group-hover:bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100/70 text-center transition-all duration-300">
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <p className="text-xs font-extrabold text-slate-700">{stats.inProgress}</p>
          </div>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Progress</p>
        </div>
        <div className="bg-white group-hover:bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100/70 text-center transition-all duration-300">
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <p className="text-xs font-extrabold text-slate-700">{stats.pending}</p>
          </div>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Pending</p>
        </div>
      </div>

      {/* Footer Tags */}
      <div className="flex items-center justify-between border-t border-slate-100/75 pt-3.5 relative z-10">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50/60 text-blue-600 rounded-lg text-[9px] font-bold border border-blue-100/30">
          🏢 {emp.department}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-50/70 text-slate-500 rounded-lg text-[9px] font-bold border border-slate-100/50">
          📍 {emp.branch?.replace(" Branch", "")}
        </span>
      </div>
    </div>
  );
};

// ==================== BRANCH CARD ====================
const BranchCard = ({ branch, color, onClick, isSelected }) => {
  const rate =
    branch.total > 0 ? ((branch.completed / branch.total) * 100).toFixed(0) : 0;

  const icons = {
    Gaurabagh: "🏢",
    "Vikas Nagar": "🏫",
    Kalyanpur: "🏬",
    Kursi: "🏘️",
    Hive: "🏗️",
    "Ring Road": "🏭",
    "Muazzam Nagar": "🏛️",
    "Aziz Nagar": "🏪",
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-4 border-2 transition-all duration-300 cursor-pointer hover-lift ${
        isSelected
          ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg ring-2 ring-blue-200"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white text-xl shadow-lg`}
        >
          {icons[branch.name] || "🏢"}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{branch.name}</h4>
          <p className="text-[11px] text-gray-500">{branch.total} tasks</p>
        </div>
        <span
          className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${
            rate >= 80
              ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
              : rate >= 50
                ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                : "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
          }`}
        >
          {rate}%
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="flex justify-between bg-emerald-50 px-2 py-1.5 rounded-lg">
          <span className="text-gray-600">Done</span>
          <span className="font-bold text-emerald-700">{branch.completed}</span>
        </div>
        <div className="flex justify-between bg-blue-50 px-2 py-1.5 rounded-lg">
          <span className="text-gray-600">Progress</span>
          <span className="font-bold text-blue-700">{branch.inProgress}</span>
        </div>
        <div className="flex justify-between bg-purple-50 px-2 py-1.5 rounded-lg">
          <span className="text-gray-600">Submitted</span>
          <span className="font-bold text-purple-700">{branch.submitted}</span>
        </div>
        <div className="flex justify-between bg-amber-50 px-2 py-1.5 rounded-lg">
          <span className="text-gray-600">Pending</span>
          <span className="font-bold text-amber-700">{branch.pending}</span>
        </div>
      </div>
    </div>
  );
};

// ==================== PAGINATION ====================
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          currentPage === 1
            ? "bg-gray-50 text-gray-300 cursor-not-allowed"
            : "bg-white border hover:bg-gray-50 hover:border-gray-300 shadow-sm"
        }`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {start > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="w-9 h-9 rounded-lg text-sm bg-white border hover:bg-gray-50 shadow-sm font-medium"
          >
            1
          </button>
          <span className="text-gray-400 text-sm px-1">...</span>
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
            currentPage === p
              ? "bg-blue-600 text-white shadow-md shadow-blue-200 scale-105"
              : "bg-white border hover:bg-gray-50 shadow-sm"
          }`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          <span className="text-gray-400 text-sm px-1">...</span>
          <button
            onClick={() => onPageChange(totalPages)}
            className="w-9 h-9 rounded-lg text-sm bg-white border hover:bg-gray-50 shadow-sm font-medium"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          currentPage === totalPages
            ? "bg-gray-50 text-gray-300 cursor-not-allowed"
            : "bg-white border hover:bg-gray-50 hover:border-gray-300 shadow-sm"
        }`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
};

// ==================== CONFIRMATION MODAL ====================
const ConfirmModal = ({ title, message, onConfirm, onCancel, loading }) => {
  useEffect(() => {
    const handleESC = (e) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", handleESC);
    return () => document.removeEventListener("keydown", handleESC);
  }, [onCancel, loading]);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && !loading && onCancel()}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scaleIn">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-rose-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-center mb-2">{title}</h3>
        <p className="text-sm text-gray-600 text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN DASHBOARD ====================
const Dashboard = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const dispatch = useDispatch();
  const allTasks = useSelector((state) => state.tasks.items);
  const dashboardStats = useSelector((state) => state.tasks.dashboardStats);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const [timeFilter, setTimeFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [dbBranches, setDbBranches] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState(null);
  const itemsPerPage = 8;

  // Lock filters for branch-head / department-head so UI matches access level.
  useEffect(() => {
    if (!user) return;
    if ((user.role === "branch-head" || user.role === "department-head") && user.branch)
      setSelectedBranch(user.branch);
    if (user.role === "department-head" && user.department)
      setSelectedDepartment(user.department);
  }, [user]);

  const branches = settings?.branches || [
    "Gaurabagh",
    "Vikas Nagar",
    "Kalyanpur",
    "Kursi",
    "Hive",
    "Ring Road",
    "Muazzam Nagar",
    "Aziz Nagar",
  ];

  const departments = settings?.departments || [
    "IT",
    "HR",
    "Graphic",
    "Academic",
    "Finance",
    "Marketing",
    "Legal",
    "Transport",
    "Operations",
    "Admin",
  ];

  const visibleBranches =
    (user?.role === "branch-head" || user?.role === "department-head") && user?.branch
      ? [user.branch]
      : branches;
  const visibleDepartments =
    user?.role === "department-head" && user?.department
      ? [user.department]
      : departments;

  const departmentsForSelectedBranch = useMemo(() => {
    if (selectedBranch === "all") {
      return visibleDepartments;
    }
    const branchObj = (dbBranches || []).find(b => b?.name === selectedBranch);
    if (branchObj && branchObj.departments && branchObj.departments.length > 0) {
      return (branchObj.departments || []).filter(dept => (visibleDepartments || []).includes(dept));
    }
    if (selectedBranch === "Central Gaurabagh" || selectedBranch === "Gaurabagh") {
      return visibleDepartments;
    }
    return (visibleDepartments || []).filter((dept) => dept === "Admin" || dept === "Academic");
  }, [selectedBranch, visibleDepartments, dbBranches]);

  const branchColors = [
    "bg-gradient-to-br from-blue-500 to-blue-600",
    "bg-gradient-to-br from-emerald-500 to-emerald-600",
    "bg-gradient-to-br from-purple-500 to-purple-600",
    "bg-gradient-to-br from-orange-500 to-orange-600",
    "bg-gradient-to-br from-pink-500 to-pink-600",
    "bg-gradient-to-br from-indigo-500 to-indigo-600",
    "bg-gradient-to-br from-teal-500 to-teal-600",
    "bg-gradient-to-br from-rose-500 to-rose-600",
  ];

  const showToast = useCallback((message, type = "success") => {
    if (type === "success") toast.success(message);
    else if (type === "error") toast.error(message);
    else toast(message);
  }, []);

  const loadTasks = useCallback(async () => {
    const statsParams = {
      department: selectedDepartment,
      branch: selectedBranch,
      timeFilter
    };
    if (timeFilter === 'custom') {
      statsParams.startDate = customStart;
      statsParams.endDate = customEnd;
    }
    
    // Both tasks and stats should be filtered by the selection
    dispatch(fetchTasks({ 
      limit: 1000, // Increased for dashboard charts & performance stats
      department: selectedDepartment,
      branch: selectedBranch,
      timeFilter
    })); 
    dispatch(fetchDashboardStats(statsParams));
  }, [dispatch, selectedDepartment, selectedBranch, timeFilter, customStart, customEnd]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const loadEmployees = useCallback(async () => {
    try {
      const role = user?.role;
      if (!["admin", "hr", "department-head", "branch-head"].includes(role)) {
        setEmployees([]);
        return;
      }

      const res = await getEmployeeSummary();
      if (res?.data?.success) {
        const fetchedUsers = (res.data.data || []).filter((e) => e.role !== "admin");
        setEmployees(fetchedUsers);
      }
    } catch (error) {
      console.error("Failed to load employees:", error);
      showToast("Failed to load employees", "error");
    }
  }, [showToast, user]);

  // Real-time polling handled centrally by useRealtimeSync in App.jsx
  // Local effect only loads employees (not handled by central hook)
  useEffect(() => {
    const loadData = async () => {
      if (allTasks.length === 0) setLoading(true);
      await loadEmployees();
      try {
        const res = await getBranches();
        if (res?.data?.success) {
          setDbBranches(res.data.data);
        }
      } catch (e) {
        console.error("Failed to load branches in Dashboard:", e);
      }
      setLoading(false);
    };
    loadData();
  }, [dispatch, loadEmployees, dashboardStats]); // Interlink employee updates with real-time stats updates

  // When branch changes, reset department filter — departments vary per branch
  useEffect(() => {
    if (user?.role !== "branch-head" && user?.role !== "department-head") {
      setSelectedDepartment("all");
    }
    setCurrentPage(1);
  }, [selectedBranch, user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDepartment, searchQuery, timeFilter]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target))
        setShowSearchDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = animations;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const getFilteredTasks = useMemo(() => {
    const now = new Date();
    let filtered = [...allTasks];

    // ── Time filter ────────────────────────────────────────────────
    switch (timeFilter) {
      case "daily": {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filtered = filtered.filter((x) => new Date(x.createdAt) >= today);
        break;
      }
      case "weekly": {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        filtered = filtered.filter((x) => new Date(x.createdAt) >= weekAgo);
        break;
      }
      case "monthly": {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        monthAgo.setHours(0, 0, 0, 0);
        filtered = filtered.filter((x) => new Date(x.createdAt) >= monthAgo);
        break;
      }
      case "custom": {
        if (customStart && customEnd) {
          const start = new Date(customStart);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          filtered = filtered.filter((x) => {
            const d = new Date(x.createdAt);
            return d >= start && d <= end;
          });
        }
        break;
      }
      default:
        break; // "all" — no filter
    }

    // ── Department & Branch filter ─────────────────────────────────
    if (selectedDepartment !== "all")
      filtered = filtered.filter((t) => t.department === selectedDepartment);
    if (selectedBranch !== "all")
      filtered = filtered.filter((t) => t.branch === selectedBranch);

    // ── Search filter ──────────────────────────────────────────────
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.assignedTo?.name?.toLowerCase().includes(q) ||
          t.assignedTo?.employeeId?.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [
    allTasks,
    timeFilter,
    customStart,
    customEnd,
    selectedDepartment,
    selectedBranch,
    searchQuery,
  ]);

  const filteredTasks = getFilteredTasks;

  // Use live MongoDB stats from API (Most accurate for Dashboard)
  const apiStats = dashboardStats?.summary;

  const totalTasks = apiStats?.totalTasks ?? 0;
  const completedTasks = apiStats?.completedTasks ?? 0;
  const inProgressTasks = apiStats?.inProgressTasks ?? 0;
  const submittedTasks = apiStats?.submittedTasks ?? 0;
  const pendingTasks = apiStats?.pendingTasks ?? 0;
  const rejectedTasks = apiStats?.rejectedTasks ?? 0;

  const pendingSubmissions = allTasks.filter((t) => t.status === "submitted");
  const canReview =
    user?.role === "department-head" && pendingSubmissions.length > 0;

  const searchResults = employees
    .filter((emp) => {
      if (!searchQuery) return false;
      const q = searchQuery.toLowerCase();
      return (
        emp.name?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.employeeId?.toLowerCase().includes(q)
      );
    })
    .slice(0, 5);

  const filteredEmployees = employees.filter((emp) => {
    if (selectedBranch !== "all" && emp.branch !== selectedBranch) return false;
    if (selectedDepartment !== "all" && emp.department !== selectedDepartment)
      return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        emp.name?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.employeeId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const getEmpStats = (eid) => {
    // This function is no longer used since backend handles it, but keeping it as a safe fallback just in case
    return { totalTasks: 0, completed: 0, pending: 0, inProgress: 0 };
  };

  const branchStats = dashboardStats?.branchStats || [];

  // ==================== CHART DATA GENERATION ====================
  const getMonthlyChartData = (tasks, startDate, endDate) => {
    const labels = [];
    const completedData = [];
    const inProgressData = [];
    const submittedData = [];
    const pendingData = [];

    let currentDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      1,
    );
    const lastDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);

    while (currentDate <= lastDate) {
      const monthStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
      const monthEnd = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      labels.push(
        currentDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
      );

      const monthTasks = tasks.filter((t) => {
        const taskDate = new Date(t.createdAt);
        return taskDate >= monthStart && taskDate <= monthEnd;
      });

      completedData.push(
        monthTasks.filter(
          (t) => t.status === "completed" || t.status === "approved",
        ).length,
      );
      inProgressData.push(
        monthTasks.filter((t) => t.status === "in-progress").length,
      );
      submittedData.push(
        monthTasks.filter((t) => t.status === "submitted").length,
      );
      pendingData.push(monthTasks.filter((t) => t.status === "pending").length);

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return {
      labels,
      completed: completedData,
      inProgress: inProgressData,
      submitted: submittedData,
      pending: pendingData,
    };
  };

  const getWeeklyChartData = (tasks, startDate, endDate) => {
    const labels = [];
    const completedData = [];
    const inProgressData = [];
    const submittedData = [];
    const pendingData = [];

    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    const day = currentDate.getDay();
    const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
    currentDate.setDate(diff);

    while (currentDate <= endDate) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      labels.push(
        `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      );

      const weekTasks = tasks.filter((t) => {
        const taskDate = new Date(t.createdAt);
        return taskDate >= weekStart && taskDate <= weekEnd;
      });

      completedData.push(
        weekTasks.filter(
          (t) => t.status === "completed" || t.status === "approved",
        ).length,
      );
      inProgressData.push(
        weekTasks.filter((t) => t.status === "in-progress").length,
      );
      submittedData.push(
        weekTasks.filter((t) => t.status === "submitted").length,
      );
      pendingData.push(weekTasks.filter((t) => t.status === "pending").length);

      currentDate.setDate(currentDate.getDate() + 7);
    }

    return {
      labels,
      completed: completedData,
      inProgress: inProgressData,
      submitted: submittedData,
      pending: pendingData,
    };
  };

  const getChartData = () => {
    const now = new Date();

    // Daily - show hourly
    if (timeFilter === "daily") {
      const hours = [];
      const hourlyData = {
        completed: [],
        inProgress: [],
        submitted: [],
        pending: [],
      };

      for (let h = 0; h < 24; h++) {
        const hourStart = new Date(now);
        hourStart.setHours(h, 0, 0, 0);
        const hourEnd = new Date(now);
        hourEnd.setHours(h, 59, 59, 999);

        hours.push(`${h}:00`);

        const hourTasks = filteredTasks.filter((t) => {
          const taskDate = new Date(t.createdAt);
          return taskDate >= hourStart && taskDate <= hourEnd;
        });

        hourlyData.completed.push(
          hourTasks.filter(
            (t) => t.status === "completed" || t.status === "approved",
          ).length,
        );
        hourlyData.inProgress.push(
          hourTasks.filter((t) => t.status === "in-progress").length,
        );
        hourlyData.submitted.push(
          hourTasks.filter((t) => t.status === "submitted").length,
        );
        hourlyData.pending.push(
          hourTasks.filter((t) => t.status === "pending").length,
        );
      }

      return {
        labels: hours,
        completed: hourlyData.completed,
        inProgress: hourlyData.inProgress,
        submitted: hourlyData.submitted,
        pending: hourlyData.pending,
      };
    }

    // Custom range
    if (timeFilter === "custom" && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      const diffTime = Math.abs(end - start);
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (days > 90) return getMonthlyChartData(filteredTasks, start, end);
      if (days > 31) return getWeeklyChartData(filteredTasks, start, end);
    }

    // All time - monthly
    if (timeFilter === "all" && filteredTasks.length > 0) {
      const sortedTasks = [...filteredTasks].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      );
      const firstDate = new Date(sortedTasks[0].createdAt);
      const lastDate = new Date(sortedTasks[sortedTasks.length - 1].createdAt);
      return getMonthlyChartData(filteredTasks, firstDate, lastDate);
    }

    // Default: daily for weekly/monthly
    let days = timeFilter === "monthly" ? 30 : 7;
    const labels = [];
    const completedData = [];
    const inProgressData = [];
    const submittedData = [];
    const pendingData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      labels.push(
        date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
      );

      const dayTasks = filteredTasks.filter((t) => {
        const taskDate = new Date(t.createdAt);
        return taskDate >= date && taskDate < nextDate;
      });

      completedData.push(
        dayTasks.filter(
          (t) => t.status === "completed" || t.status === "approved",
        ).length,
      );
      inProgressData.push(
        dayTasks.filter((t) => t.status === "in-progress").length,
      );
      submittedData.push(
        dayTasks.filter((t) => t.status === "submitted").length,
      );
      pendingData.push(dayTasks.filter((t) => t.status === "pending").length);
    }

    return {
      labels,
      completed: completedData,
      inProgress: inProgressData,
      submitted: submittedData,
      pending: pendingData,
    };
  };

  const chartData = getChartData();

  const barData = {
    labels: chartData.labels,
    datasets: [
      {
        label: "Completed",
        data: chartData.completed,
        backgroundColor: "rgba(16, 185, 129, 0.8)",
        borderColor: "rgb(16, 185, 129)",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: "In Progress",
        data: chartData.inProgress,
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: "Submitted",
        data: chartData.submitted,
        backgroundColor: "rgba(168, 85, 247, 0.8)",
        borderColor: "rgb(168, 85, 247)",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: "Pending",
        data: chartData.pending,
        backgroundColor: "rgba(234, 179, 8, 0.8)",
        borderColor: "rgb(234, 179, 8)",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const doughnutData = {
    labels: ["Pending", "In Progress", "Submitted", "Completed", "Rejected"],
    datasets: [
      {
        data: [
          pendingTasks,
          inProgressTasks,
          submittedTasks,
          completedTasks,
          rejectedTasks,
        ],
        backgroundColor: [
          "rgba(234, 179, 8, 0.9)",
          "rgba(59, 130, 246, 0.9)",
          "rgba(168, 85, 247, 0.9)",
          "rgba(16, 185, 129, 0.9)",
          "rgba(239, 68, 68, 0.9)",
        ],
        borderColor: [
          "rgb(234, 179, 8)",
          "rgb(59, 130, 246)",
          "rgb(168, 85, 247)",
          "rgb(16, 185, 129)",
          "rgb(239, 68, 68)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const exportCSV = () => {
    const rows = [
      [
        "Employee",
        "Department",
        "Branch",
        "Role",
        "Email",
        "Total",
        "Done",
        "Progress",
        "Pending",
      ],
    ];
    filteredEmployees.forEach((emp) => {
      rows.push([
        emp.name || "",
        emp.department || "",
        emp.branch || "",
        emp.role || "",
        emp.email || "",
        emp.totalTasks || 0,
        emp.completed || 0,
        emp.inProgress || 0,
        emp.pending || 0,
      ]);
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], {
        type: "text/csv",
      }),
    );
    a.download = `dashboard_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    showToast("Report downloaded successfully!", "success");
  };

  const handleReview = async (tid, status, comments) => {
    setReviewLoading(true);
    try {
      await reviewTask(tid, status, comments);
      showToast(`Task ${status} successfully!`, "success");
      await loadTasks();
      setSelectedTaskForReview(null);
      setReviewComment("");
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Failed to review task",
        "error",
      );
    }
    setReviewLoading(false);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        labels: { usePointStyle: true, padding: 16, font: { size: 11 } },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, font: { size: 10 } },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, maxRotation: 45 },
      },
    },
  };

  const getTimeLabel = () => {
    if (timeFilter === "daily") return "Today (Hourly)";
    if (timeFilter === "weekly") return "Last 7 days";
    if (timeFilter === "monthly") return "Last 30 days";
    if (timeFilter === "custom")
      return `${customStart || "?"} to ${customEnd || "?"}`;
    return "All Time (Monthly)";
  };

  // ==================== ROLE CHECK ====================
  const isManagerRole = ["admin", "department-head", "branch-head"].includes(
    user?.role,
  );

  // ==================== EMPLOYEE VIEW ====================
  if (!isManagerRole) {
    if (loading && allTasks.length === 0) return <DashboardSkeleton />;

    const stats = dashboardStats?.summary || {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        submittedTasks: 0,
        rejectedTasks: 0,
        overdueTasks: 0
    };

    const completionRate = stats.totalTasks > 0 ? ((stats.completedTasks / stats.totalTasks) * 100).toFixed(0) : 0;

    return (
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto animate-fadeIn">

        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Welcome back, {user?.name?.split(" ")[0]}! 👋
              </h1>
              <p className="text-blue-100 mt-2 capitalize">
                {user?.role?.replace(/-/g, " ")} • {user?.department} •{" "}
                {user?.branch}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: "Total Tasks",
              value: stats.totalTasks,
              icon: "📋",
              color: "bg-slate-100 text-slate-600",
            },
            {
              label: "Pending",
              value: stats.pendingTasks,
              icon: "⏳",
              color: "bg-amber-100 text-amber-600",
            },
            {
              label: "In Progress",
              value: stats.inProgressTasks,
              icon: "🔄",
              color: "bg-blue-100 text-blue-600",
            },
            {
              label: "Submitted",
              value: stats.submittedTasks,
              icon: "📤",
              color: "bg-purple-100 text-purple-600",
            },
            {
              label: "Completed",
              value: stats.completedTasks,
              icon: "✅",
              color: "bg-emerald-100 text-emerald-600",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 shadow-sm border hover-lift animate-fadeInUp text-center"
            >
              <div
                className={`w-10 h-10 ${s.color} rounded-lg flex items-center justify-center text-lg mx-auto mb-2`}
              >
                {s.icon}
              </div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex justify-between mb-3">
            <span className="font-semibold">Completion Rate</span>
            <span className="text-2xl font-bold text-emerald-600">
              {completionRate}%
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Overdue */}
        {stats.overdueTasks > 0 && (
          <div className="bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 rounded-xl p-5 flex items-center gap-4">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-rose-700">Overdue Tasks!</p>
              <p className="text-sm text-rose-600">
                You have {stats.overdueTasks} overdue task{stats.overdueTasks > 1 ? "s" : ""}.
              </p>
            </div>
            <button
              onClick={() => navigate("/tasks")}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-700"
            >
              View Tasks
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            {
              label: "My Tasks",
              icon: "📋",
              path: "/tasks",
              color: "from-blue-500 to-blue-600",
            },
            {
              label: "Profile",
              icon: "👤",
              path: "/profile",
              color: "from-purple-500 to-purple-600",
            },
          ].map((a, i) => (
            <button
              key={i}
              onClick={() => navigate(a.path)}
              className={`bg-gradient-to-r ${a.color} text-white rounded-xl p-4 hover-lift flex items-center gap-3 font-medium`}
            >
              <span className="text-2xl">{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ==================== MANAGER VIEW ====================
  if (loading && (!dashboardStats || allTasks.length === 0))
    return <DashboardSkeleton />;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-gray-900 rounded-2xl p-6 text-white shadow-xl animate-fadeIn">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">📊 Dashboard</h1>
            <p className="text-slate-300 text-sm mt-1">
              {user?.name} •{" "}
              <span className="capitalize">
                {user?.role?.replace(/-/g, " ")}
              </span>{" "}
              • {user?.department}
            </p>
          </div>
          <button
            onClick={loadTasks}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border animate-fadeInUp space-y-4">
        {/* Time Period */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">
            Period:
          </span>
          {[
            { k: "daily", l: "📅 Today" },
            { k: "weekly", l: "📆 Weekly" },
            { k: "monthly", l: "📊 Monthly" },
            { k: "custom", l: "📋 Custom" },
            { k: "all", l: "🗂 All Time" },
          ].map(({ k, l }) => (
            <button
              key={k}
              onClick={() => setTimeFilter(k)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                timeFilter === k
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {l}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 border border-emerald-200"
          >
            📥 Export CSV
          </button>
        </div>

        {/* Custom Date */}
        {timeFilter === "custom" && (
          <div className="flex flex-wrap items-center gap-3 bg-gray-50 rounded-xl p-3 animate-fadeIn">
            <span className="text-xs">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-2 border rounded-lg text-xs"
            />
            <span className="text-xs">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-2 border rounded-lg text-xs"
            />
            <button
              onClick={() => {
                setTimeFilter("weekly");
                setCustomStart("");
                setCustomEnd("");
              }}
              className="text-xs text-rose-600 ml-auto"
            >
              Clear
            </button>
          </div>
        )}

        {/* Branch + Dept + Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-stretch lg:items-center gap-3">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            disabled={user?.role === "branch-head"}
            className="w-full lg:w-auto px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs min-w-[150px] focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition"
          >
            <option value="all">All Branches</option>
            {visibleBranches.map((b) => (
              <option key={b} value={b}>
                📍 {b}
              </option>
            ))}
          </select>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            disabled={user?.role === "department-head"}
            className="w-full lg:w-auto px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs min-w-[150px] focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition"
          >
            <option value="all">All Departments</option>
            {departmentsForSelectedBranch.map((d) => (
              <option key={d} value={d}>
                🏢 {d}
              </option>
            ))}
          </select>
          <div className="w-full lg:flex-1 lg:min-w-[200px] relative" ref={searchInputRef}>
            <input
              type="text"
              placeholder="🔍 Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
            {showSearchDropdown && searchQuery && searchResults.length > 0 && (
              <div className="absolute z-20 top-full mt-2 w-full bg-white border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {searchResults.map((emp) => (
                  <div
                    key={emp._id}
                    onClick={() => {
                      setSearchQuery(emp.name);
                      setShowSearchDropdown(false);
                      navigate(`/employee/${emp._id}`);
                    }}
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3"
                  >
                    <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {emp.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{emp.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {emp.department} • {emp.branch}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setTimeFilter("weekly");
              setSelectedBranch("all");
              setSelectedDepartment("all");
              setSearchQuery("");
              setCustomStart("");
              setCustomEnd("");
            }}
            className="w-full lg:w-auto px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-100 border border-rose-200 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
          >
            <span>✕</span> <span>Reset</span>
          </button>
        </div>

        {/* Summary */}
        <div className="text-xs text-gray-500 pt-3 border-t">
          📊 <strong className="text-gray-700">{totalTasks}</strong> tasks for{" "}
          <strong className="text-gray-700">{getTimeLabel()}</strong>
          {selectedBranch !== "all" && (
            <span className="ml-2">
              • 📍 <strong>{selectedBranch}</strong>
            </span>
          )}
          {selectedDepartment !== "all" && (
            <span className="ml-2">
              • 🏢 <strong>{selectedDepartment}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { l: "Total", v: totalTasks },
          { l: "Done", v: completedTasks, c: "text-emerald-600" },
          { l: "Progress", v: inProgressTasks, c: "text-blue-600" },
          { l: "Pending", v: pendingTasks, c: "text-amber-600" },
          { l: "Submitted", v: submittedTasks, c: "text-purple-600" },
          { l: "Rejected", v: rejectedTasks, c: "text-rose-600" },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 shadow-sm border text-center hover-lift animate-fadeInUp"
          >
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">
              {s.l}
            </p>
            <p className={`text-xl font-bold ${s.c || "text-gray-800"}`}>
              {s.v}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border animate-fadeInUp">
          <h2 className="font-semibold text-sm mb-4">
            📈 Task Trend ({getTimeLabel()})
          </h2>
          <div className="h-64">
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border animate-fadeInUp">
          <h2 className="font-semibold text-sm mb-4">📊 Status Distribution</h2>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                cutout: "65%",
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: {
                      usePointStyle: true,
                      padding: 16,
                      font: { size: 10 },
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Department Health (Hidden per user request) */}
      {/* {visibleDepartments.length > 0 && selectedDepartment === "all" && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border animate-fadeInUp">
          <h2 className="font-semibold text-sm mb-4">🏢 Department Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentStats.map((d, index) => (
              <DepartmentCard
                key={d.name}
                department={{
                  name: d.name,
                  icon: "🏢",
                }}
                stats={d}
                onClick={() => setSelectedDepartment(d.name)}
              />
            ))}
          </div>
        </div>
      )} */}

      {/* Employees */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border animate-fadeInUp">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-sm">
            👥 Employees ({filteredEmployees.length})
          </h2>
          <span className="text-xs text-gray-400">
            Page {currentPage} of {totalPages || 1}
          </span>
        </div>
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            🔍 No employees found
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {paginatedEmployees.map((emp, index) => (
                <EmployeeMiniCard
                  key={emp._id || emp.id}
                  emp={emp}
                  stats={{
                    totalTasks: emp.totalTasks || 0,
                    completed: emp.completed || 0,
                    pending: emp.pending || 0,
                    inProgress: emp.inProgress || 0
                  }}
                  onClick={() => navigate(`/employee/${emp._id || emp.id}`)}
                  index={index}
                />
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Branches */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border animate-fadeInUp">
        <h2 className="font-semibold text-sm mb-4">📍 Branch Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {branchStats.map((b, i) => (
            <BranchCard
              key={b.name}
              branch={b}
              color={branchColors[i % branchColors.length]}
              isSelected={selectedBranch === b.name}
              onClick={() =>
                setSelectedBranch(selectedBranch === b.name ? "all" : b.name)
              }
            />
          ))}
        </div>
      </div>
      {canReview && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-200 animate-fadeInUp">
          <h2 className="font-semibold text-sm mb-3">
            ⏳ Pending Reviews ({pendingSubmissions.length})
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {pendingSubmissions.slice(0, 5).map((t) => (
              <div
                key={t._id}
                className="bg-white rounded-xl p-3 border border-orange-100 flex justify-between items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{t.title}</h3>
                  <p className="text-[11px] text-gray-500">
                    {t.assignedTo?.name} • {t.department}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTaskForReview(t)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedTaskForReview && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={(e) =>
            e.target === e.currentTarget &&
            !reviewLoading &&
            setSelectedTaskForReview(null)
          }
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-scaleIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">📋 Review Task</h3>
              <button
                onClick={() => {
                  setSelectedTaskForReview(null);
                  setReviewComment("");
                }}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="font-semibold">{selectedTaskForReview.title}</p>
              <p className="text-xs text-gray-500 mt-2">
                {selectedTaskForReview.assignedTo?.name} •{" "}
                {selectedTaskForReview.department}
              </p>
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full p-3 border rounded-xl text-sm mb-4 resize-none"
              rows={3}
              placeholder="Feedback..."
            />
            <div className="flex gap-3">
              <button
                onClick={() =>
                  handleReview(
                    selectedTaskForReview._id,
                    "approved",
                    reviewComment,
                  )
                }
                disabled={reviewLoading}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                ✅ Approve
              </button>
              <button
                onClick={() =>
                  handleReview(
                    selectedTaskForReview._id,
                    "rejected",
                    reviewComment,
                  )
                }
                disabled={reviewLoading}
                className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                ❌ Reject
              </button>
              <button
                onClick={() => {
                  setSelectedTaskForReview(null);
                  setReviewComment("");
                }}
                disabled={reviewLoading}
                className="px-4 py-2.5 bg-gray-100 rounded-xl text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          {...confirmModal}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
