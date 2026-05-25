import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchTasks, fetchDashboardStats } from "../../store/features/tasks";
import {
  getEmployeeSummary,
  getBranches,
  reviewTask,
  getTaskAnalytics
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer, ComposedChart, Line, PieChart, Pie, Cell } from 'recharts';
import toast from "react-hot-toast";

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:5001/api"
).replace(/\/api\/?$/, "");

// ==================== ANIMATIONS ====================
const animations = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
  .animate-fadeInUp { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .animate-fadeIn { animation: fadeIn 0.25s ease-out both; }
  .animate-scaleIn { animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .skeleton { 
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 1000px 100%;
    animation: shimmer 1.8s infinite linear;
  }
  .stagger-1 { animation-delay: 40ms; }
  .stagger-2 { animation-delay: 80ms; }
  .stagger-3 { animation-delay: 120ms; }
  .stagger-4 { animation-delay: 160ms; }
  .stagger-5 { animation-delay: 200ms; }
  .stagger-6 { animation-delay: 240ms; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// ==================== SKELETON LOADER ====================
const Skeleton = ({ className = "" }) => (
  <div className={`skeleton rounded-xl ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
    <div className="bg-gradient-to-r from-slate-800 to-slate-950 rounded-2xl p-6 md:p-8">
      <Skeleton className="h-6 w-48 bg-slate-700/60 mb-2" />
      <Skeleton className="h-4 w-32 bg-slate-700/40" />
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <Skeleton className="h-3 w-16 mb-2 bg-slate-100" />
          <Skeleton className="h-7 w-12 bg-slate-200" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-150">
        <Skeleton className="h-4 w-32 mb-4 bg-slate-200" />
        <Skeleton className="h-56 w-full bg-slate-100" />
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-150">
        <Skeleton className="h-4 w-24 mb-4 bg-slate-200" />
        <Skeleton className="h-56 w-full rounded-full bg-slate-100" />
      </div>
    </div>

    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-150">
      <Skeleton className="h-4 w-32 mb-4 bg-slate-200" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full bg-slate-200" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1 bg-slate-200" />
                <Skeleton className="h-3 w-16 bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ==================== EMPTY STATE ====================
const EmptyState = ({ message = "No records found" }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 border border-slate-100">
      <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <p className="text-slate-400 text-xs font-medium">{message}</p>
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
      className={`group relative bg-white rounded-2xl border border-slate-200/60 p-4 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all duration-300 animate-fadeInUp stagger-${(index % 6) + 1}`}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/0 via-indigo-500/0 to-indigo-500/[0.01] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            {emp.avatar ? (
              <img
                src={emp.avatar.startsWith("http") ? emp.avatar : `${API_ORIGIN}${emp.avatar}`}
                alt={emp.name}
                className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-slate-50 group-hover:ring-blue-50 transition-all duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = "";
                  e.currentTarget.removeAttribute("src");
                }}
              />
            ) : (
              <div
                className={`w-10 h-10 bg-gradient-to-br ${colors[emp.department] || "from-slate-500 to-slate-650"} rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm transition-all duration-300 group-hover:scale-105`}
              >
                {getInitials(emp.name)}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
          </div>

          <div className="min-w-0">
            <h4 className="font-semibold text-slate-800 text-sm tracking-tight truncate group-hover:text-blue-600 transition-colors duration-305">
              {emp.name}
            </h4>
            <span className="text-[10px] font-medium text-slate-400 capitalize truncate block mt-0.5">
              {emp.role?.replace(/-/g, " ") || "Member"}
            </span>
          </div>
        </div>

        <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/50 group-hover:border-blue-100 group-hover:bg-blue-50/50 group-hover:text-blue-650 transition-all duration-305">
          #{emp.employeeId || "N/A"}
        </span>
      </div>

      <div className="flex flex-col gap-1 mb-3 p-2 bg-slate-50/50 group-hover:bg-blue-50/10 rounded-xl border border-slate-100 transition-all duration-300 relative z-10">
        <div className="flex items-center gap-2 min-w-0 text-slate-500" title={emp.email}>
          <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors duration-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-xs truncate">{emp.email || "No Email"}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0 text-slate-500">
          <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors duration-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span className="text-xs truncate">{emp.phone || "Not Provided"}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
        <div className="bg-slate-50 group-hover:bg-slate-100/50 p-2 rounded-xl text-center transition-all duration-300">
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <p className="text-xs font-bold text-slate-700">{stats.completed}</p>
          </div>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Done</p>
        </div>
        <div className="bg-slate-50 group-hover:bg-slate-100/50 p-2 rounded-xl text-center transition-all duration-300">
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <p className="text-xs font-bold text-slate-700">{stats.inProgress}</p>
          </div>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Progress</p>
        </div>
        <div className="bg-slate-50 group-hover:bg-slate-100/50 p-2 rounded-xl text-center transition-all duration-300">
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <p className="text-xs font-bold text-slate-700">{stats.pending}</p>
          </div>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Pending</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 relative z-10">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-semibold border border-blue-100">
          🏢 {emp.department}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-600 rounded-full text-[10px] font-semibold border border-slate-200/60">
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
      className={`rounded-2xl p-4 border transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
        isSelected
          ? "border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50/40 shadow-sm ring-1 ring-blue-100"
          : "border-slate-200/60 bg-white hover:border-slate-300 shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white text-lg shadow-sm`}
        >
          {icons[branch.name] || "🏢"}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-slate-800 tracking-tight truncate">{branch.name}</h4>
          <p className="text-[11px] font-medium text-slate-400">{branch.total} tasks</p>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            rate >= 80
              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
              : rate >= 50
                ? "bg-amber-50 text-amber-600 border-amber-100"
                : "bg-rose-50 text-rose-600 border-rose-100"
          }`}
        >
          {rate}%
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="flex justify-between bg-emerald-50/50 px-2 py-1.5 rounded-lg border border-emerald-100/50">
          <span className="text-emerald-700">Done</span>
          <span className="font-bold text-emerald-800">{branch.completed}</span>
        </div>
        <div className="flex justify-between bg-blue-50/50 px-2 py-1.5 rounded-lg border border-blue-100/50">
          <span className="text-blue-700">Progress</span>
          <span className="font-bold text-blue-800">{branch.inProgress}</span>
        </div>
        <div className="flex justify-between bg-purple-50/50 px-2 py-1.5 rounded-lg border border-purple-100/50">
          <span className="text-purple-700">Submitted</span>
          <span className="font-bold text-purple-800">{branch.submitted}</span>
        </div>
        <div className="flex justify-between bg-amber-50/50 px-2 py-1.5 rounded-lg border border-amber-100/50">
          <span className="text-amber-700">Pending</span>
          <span className="font-bold text-amber-800">{branch.pending}</span>
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
        className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-300 ${
          currentPage === 1
            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {start > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="w-9 h-9 rounded-lg text-sm bg-white border border-slate-200 hover:bg-slate-50 shadow-sm font-semibold transition-all duration-300"
          >
            1
          </button>
          <span className="text-slate-400 text-sm px-1 font-bold">...</span>
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all duration-300 ${
            currentPage === p
              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 scale-105"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
          }`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          <span className="text-slate-400 text-sm px-1 font-bold">...</span>
          <button
            onClick={() => onPageChange(totalPages)}
            className="w-9 h-9 rounded-lg text-sm bg-white border border-slate-200 hover:bg-slate-50 shadow-sm font-semibold transition-all duration-300"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-300 ${
          currentPage === totalPages
            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && !loading && onCancel()}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 animate-scaleIn">
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-center mb-2 text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
};

// ==================== MAIN DASHBOARD ====================
const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  const dispatch = useDispatch();
  const allTasks = useSelector((state) => state.tasks.items);
  const dashboardStats = useSelector((state) => state.tasks.dashboardStats);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
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

  // Lock filters for branch-head / department-head
  useEffect(() => {
    if (!user) return;
    if ((user.role === "branch-head" || user.role === "department-head") && user.branch) {
      setSelectedBranch(user.branch);
    }
    if (user.role === "department-head" && user.department) {
      setSelectedDepartment(user.department);
    }
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

  const visibleBranches = useMemo(() => {
    return (user?.role === "branch-head" || user?.role === "department-head") && user?.branch
      ? [user.branch]
      : branches;
  }, [user, branches]);

  const visibleDepartments = useMemo(() => {
    return user?.role === "department-head" && user?.department
      ? [user.department]
      : departments;
  }, [user, departments]);

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
    "bg-gradient-to-br from-blue-500 to-indigo-600",
    "bg-gradient-to-br from-emerald-500 to-teal-600",
    "bg-gradient-to-br from-purple-500 to-violet-600",
    "bg-gradient-to-br from-orange-500 to-amber-600",
    "bg-gradient-to-br from-pink-500 to-rose-600",
    "bg-gradient-to-br from-cyan-500 to-blue-600",
    "bg-gradient-to-br from-teal-500 to-emerald-600",
    "bg-gradient-to-br from-rose-500 to-pink-600",
  ];

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
    
    dispatch(fetchTasks({ 
      limit: 1000,
      department: selectedDepartment,
      branch: selectedBranch,
      timeFilter
    })); 
    dispatch(fetchDashboardStats(statsParams));
    
    getTaskAnalytics().then(res => {
        if (res?.data?.success) setAnalyticsData(res.data.data);
    }).catch(err => console.error("Error fetching analytics", err));
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
      toast.error("Failed to load employee list");
    }
  }, [user]);

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
  }, [loadEmployees, allTasks.length]);

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
      if (searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
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

  const filteredLeadershipEmployees = useMemo(() => {
    const leadershipRoles = ["admin", "branch-head", "department-head", "manager"];
    return employees.filter((emp) => {
      if (!leadershipRoles.includes(emp.role)) return false;
      if (selectedBranch !== "all" && emp.branch !== selectedBranch) return false;
      if (selectedDepartment !== "all" && emp.department !== selectedDepartment) return false;
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
  }, [employees, selectedBranch, selectedDepartment, searchQuery]);

  const filteredStaffEmployees = useMemo(() => {
    const leadershipRoles = ["admin", "branch-head", "department-head", "manager"];
    return employees.filter((emp) => {
      if (leadershipRoles.includes(emp.role)) return false;
      if (selectedBranch !== "all" && emp.branch !== selectedBranch) return false;
      if (selectedDepartment !== "all" && emp.department !== selectedDepartment) return false;
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
  }, [employees, selectedBranch, selectedDepartment, searchQuery]);

  const filteredEmployeesForCSV = useMemo(() => {
    return [...filteredLeadershipEmployees, ...filteredStaffEmployees];
  }, [filteredLeadershipEmployees, filteredStaffEmployees]);

  const totalPages = Math.ceil(filteredStaffEmployees.length / itemsPerPage);
  
  const paginatedEmployees = useMemo(() => {
    return filteredStaffEmployees.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredStaffEmployees, currentPage, itemsPerPage]);

  const branchStats = dashboardStats?.branchStats || [];

  const exportCSV = () => {
    const rows = [
      [
        "Employee",
        "Department",
        "Branch",
        "Role",
        "Email",
        "Total Tasks",
        "Completed",
        "In Progress",
        "Pending",
      ],
    ];
    filteredEmployeesForCSV.forEach((emp) => {
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
    toast.success("Report downloaded successfully!");
  };

  const handleReview = async (tid, status, comments) => {
    setReviewLoading(true);
    try {
      await reviewTask(tid, status, comments);
      toast.success(`Task ${status} successfully!`);
      await loadTasks();
      setSelectedTaskForReview(null);
      setReviewComment("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to review task");
    }
    setReviewLoading(false);
  };

  const getTimeLabel = () => {
    if (timeFilter === "daily") return "Today (Hourly)";
    if (timeFilter === "weekly") return "Last 7 days";
    if (timeFilter === "monthly") return "Last 30 days";
    if (timeFilter === "custom") return `${customStart || "?"} to ${customEnd || "?"}`;
    return "All Time (Monthly)";
  };

  if (authLoading && !user) return <DashboardSkeleton />;

  const isManagerRole = ["admin", "department-head", "branch-head"].includes(user?.role);

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
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/10">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Welcome back, {user?.name?.split(" ")[0]}! 👋
            </h1>
            <p className="text-blue-100 text-sm mt-2 font-medium capitalize">
              {user?.role?.replace(/-/g, " ")} 
              {user?.department && user.department.toLowerCase() !== user.role?.toLowerCase() && ` • ${user.department}`}
              {user?.branch && ` • ${user.branch}`}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Total Tasks", value: stats.totalTasks, status: "all", bg: "bg-slate-50/60 border-slate-200/80 text-slate-700 hover:border-slate-350", fill: "bg-slate-100 text-slate-600" },
            { label: "Pending", value: stats.pendingTasks, status: "pending", bg: "bg-amber-50/40 border-amber-100 text-amber-700 hover:border-amber-250", fill: "bg-amber-100/60 text-amber-600" },
            { label: "In Progress", value: stats.inProgressTasks, status: "in-progress", bg: "bg-blue-50/40 border-blue-100 text-blue-700 hover:border-blue-250", fill: "bg-blue-100/60 text-blue-600" },
            { label: "Submitted", value: stats.submittedTasks, status: "submitted", bg: "bg-purple-50/40 border-purple-100 text-purple-700 hover:border-purple-250", fill: "bg-purple-100/60 text-purple-600" },
            { label: "Completed", value: stats.completedTasks, status: "approved", bg: "bg-emerald-50/40 border-emerald-100 text-emerald-700 hover:border-emerald-250", fill: "bg-emerald-100/60 text-emerald-600" },
          ].map((s, i) => (
            <div
              key={i}
              onClick={() => navigate(`/tasks?status=${s.status}`)}
              className={`rounded-2xl px-2 py-3.5 md:px-4 md:py-4 shadow-sm border text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 animate-fadeInUp stagger-${i + 1} ${s.bg}`}
            >
              <div className={`w-8 h-8 ${s.fill} rounded-xl flex items-center justify-center text-sm mx-auto mb-2.5 font-bold shadow-sm`}>
                {s.label.charAt(0)}
              </div>
              <p className="text-[10px] md:text-xs text-slate-500 font-semibold tracking-wider uppercase truncate">{s.label}</p>
              <p className="text-xl md:text-2xl font-bold mt-1 text-slate-800">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold text-slate-700 text-sm">Completion Rate</span>
            <span className="text-xl font-bold text-emerald-600">{completionRate}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Overdue */}
        {stats.overdueTasks > 0 && (
          <div className="bg-gradient-to-r from-rose-50 to-red-50/55 border border-rose-200/80 rounded-2xl p-5 flex items-center gap-4 animate-pulse">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-rose-700 text-sm">Overdue Tasks!</p>
              <p className="text-xs text-rose-600/80 mt-0.5 leading-relaxed">
                You have {stats.overdueTasks} overdue task{stats.overdueTasks > 1 ? "s" : ""}. Please complete them immediately.
              </p>
            </div>
            <button
              onClick={() => navigate("/tasks")}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 shadow-sm transition-all duration-300"
            >
              View Tasks
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "My Tasks", icon: "📋", path: "/tasks", color: "from-blue-600 to-indigo-600 shadow-blue-100" },
            { label: "Profile", icon: "👤", path: "/profile", color: "from-purple-600 to-violet-600 shadow-purple-100" },
          ].map((a, i) => (
            <button
              key={i}
              onClick={() => navigate(a.path)}
              className={`bg-gradient-to-r ${a.color} text-white rounded-2xl p-4 hover-lift flex items-center justify-center gap-3 font-semibold text-sm shadow-md transition-all duration-300`}
            >
              <span className="text-lg">{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ==================== MANAGER VIEW ====================
  if (loading && (!dashboardStats || allTasks.length === 0)) {
    return <DashboardSkeleton />;
  }

  const apiStats = dashboardStats?.summary || {
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    submittedTasks: 0,
    rejectedTasks: 0
  };

  const totalTasks = apiStats.totalTasks ?? 0;
  const completedTasks = apiStats.completedTasks ?? 0;
  const inProgressTasks = apiStats.inProgressTasks ?? 0;
  const submittedTasks = apiStats.submittedTasks ?? 0;
  const pendingTasks = apiStats.pendingTasks ?? 0;
  const rejectedTasks = apiStats.rejectedTasks ?? 0;

  const pendingSubmissions = allTasks.filter((t) => t.status === "submitted");
  const canReview = user?.role === "department-head" && pendingSubmissions.length > 0;

  const searchQueryLowerCase = searchQuery?.toLowerCase();
  const searchResults = searchQuery
    ? employees
        .filter((emp) => {
          return (
            emp.name?.toLowerCase().includes(searchQueryLowerCase) ||
            emp.email?.toLowerCase().includes(searchQueryLowerCase) ||
            emp.employeeId?.toLowerCase().includes(searchQueryLowerCase)
          );
        })
        .slice(0, 5)
    : [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl p-6 text-white shadow-xl animate-fadeIn">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">📊 Dashboard</h1>
            <p className="text-slate-400 text-xs mt-1 font-medium leading-relaxed capitalize">
              {user?.name} • {user?.role?.replace(/-/g, " ")}
              {user?.department && user.department.toLowerCase() !== user.role?.toLowerCase() && ` • ${user.department}`}
            </p>
          </div>
          <button
            onClick={loadTasks}
            className="w-full sm:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 text-white"
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="relative z-30 bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 animate-fadeInUp space-y-4">
        {/* Time Period Filter */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Period:</span>
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                  timeFilter === k
                    ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/50"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="lg:ml-auto">
            <button
              onClick={exportCSV}
              className="w-full lg:w-auto px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100/70 border border-emerald-200 active:scale-95 transition-all duration-300 flex items-center justify-center gap-1.5"
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Custom Date Inputs */}
        {timeFilter === "custom" && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              onClick={() => {
                setTimeFilter("weekly");
                setCustomStart("");
                setCustomEnd("");
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors ml-auto"
            >
              Clear Range
            </button>
          </div>
        )}

        {/* Branch Select + Department Select + Search Box + Reset */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
          {/* Branch Select */}
          <div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              disabled={user?.role === "branch-head" || user?.role === "department-head"}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition truncate"
            >
              <option value="all">📍 All Branches</option>
              {visibleBranches.map((b) => (
                <option key={b} value={b}>
                  📍 {b}
                </option>
              ))}
            </select>
          </div>

          {/* Department Select */}
          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              disabled={user?.role === "department-head"}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition truncate"
            >
              <option value="all">🏢 All Departments</option>
              {departmentsForSelectedBranch.map((d) => (
                <option key={d} value={d}>
                  🏢 {d === "Academic" ? "Academics" : d}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative" ref={searchInputRef}>
            <input
              type="text"
              placeholder="🔍 Search employees..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
            />
            {showSearchDropdown && searchQuery && searchResults.length > 0 && (
              <div className="absolute z-20 top-full mt-2 w-full bg-white border border-slate-200/80 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-fadeIn divide-y divide-slate-50">
                {searchResults.map((emp) => (
                  <div
                    key={emp._id}
                    onClick={() => {
                      setSearchQuery(emp.name);
                      setShowSearchDropdown(false);
                      navigate(`/employee/${emp._id}`);
                    }}
                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors duration-200"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {emp.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{emp.name}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {emp.department} • {emp.branch}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset Filters Button */}
          <div>
            <button
              onClick={() => {
                setTimeFilter("weekly");
                setSelectedBranch("all");
                setSelectedDepartment("all");
                setSearchQuery("");
                setCustomStart("");
                setCustomEnd("");
              }}
              className="w-full px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-100/70 border border-rose-200 active:scale-95 transition-all duration-300 flex items-center justify-center gap-1.5"
            >
              ✕ Reset Filters
            </button>
          </div>
        </div>

        {/* Selected parameters label */}
        <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
          <span>📊 Showing</span>
          <strong className="text-slate-600 font-bold">{totalTasks}</strong>
          <span>tasks for</span>
          <strong className="text-slate-600 font-bold">{getTimeLabel()}</strong>
          {selectedBranch !== "all" && (
            <>
              <span>• Branch:</span>
              <strong className="text-slate-600 font-bold">📍 {selectedBranch}</strong>
            </>
          )}
          {selectedDepartment !== "all" && (
            <>
              <span>• Dept:</span>
              <strong className="text-slate-600 font-bold">🏢 {selectedDepartment}</strong>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { l: "Total", v: totalTasks, status: "all", bg: "bg-slate-50/50 border-slate-200/80 hover:border-slate-350 hover:bg-slate-100/50", c: "text-slate-700" },
          { l: "Done", v: completedTasks, status: "approved", bg: "bg-emerald-50/30 border-emerald-100/80 hover:border-emerald-250 hover:bg-emerald-50/50", c: "text-emerald-600" },
          { l: "Progress", v: inProgressTasks, status: "in-progress", bg: "bg-blue-50/30 border-blue-100/80 hover:border-blue-250 hover:bg-blue-50/50", c: "text-blue-600" },
          { l: "Pending", v: pendingTasks, status: "pending", bg: "bg-amber-50/30 border-amber-100/80 hover:border-amber-250 hover:bg-amber-50/50", c: "text-amber-600" },
          { l: "Submitted", v: submittedTasks, status: "submitted", bg: "bg-purple-50/30 border-purple-100/80 hover:border-purple-250 hover:bg-purple-50/50", c: "text-purple-650" },
          { l: "Rejected", v: rejectedTasks, status: "rejected", bg: "bg-rose-50/30 border-rose-100/80 hover:border-rose-250 hover:bg-rose-50/50", c: "text-rose-600" },
        ].map((s, i) => (
          <div
            key={i}
            onClick={() => navigate(`/tasks?status=${s.status}`)}
            className={`rounded-2xl px-2 py-3.5 md:px-4 md:py-4 shadow-sm border text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 animate-fadeInUp stagger-${i + 1} ${s.bg}`}
          >
            <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider truncate font-semibold">
              {s.l}
            </p>
            <p className={`text-xl md:text-2xl font-bold mt-1 tracking-tight ${s.c}`}>
              {s.v}
            </p>
          </div>
        ))}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 animate-fadeInUp">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-sm text-slate-700">
              📈 Employee Productivity ({timeFilter})
            </h2>
          </div>
          <div className="w-full h-64 max-h-[260px]">
            {analyticsData?.employeeProductivity && analyticsData.employeeProductivity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analyticsData.employeeProductivity}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="employeeName" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748B' }} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748B' }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748B' }} />
                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} />
                        <RechartsLegend iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#475569' }} />
                        <Bar yAxisId="left" dataKey="totalTasksCompleted" name="Tasks Completed" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={16} />
                        <Line yAxisId="right" type="monotone" dataKey="averageTimeSpent" name="Avg Time (mins)" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3.5, fill: '#8B5CF6' }} />
                    </ComposedChart>
                </ResponsiveContainer>
            ) : (
                <EmptyState message="No productivity data available" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 animate-fadeInUp">
          <h2 className="font-semibold text-sm mb-4 text-slate-700">🏢 Department Workload</h2>
          <div className="w-full h-64 max-h-[260px] flex items-center justify-center">
             {analyticsData?.departmentWorkload && analyticsData.departmentWorkload.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={analyticsData.departmentWorkload}
                            dataKey="totalTasks"
                            nameKey="_id"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={3}
                        >
                            {analyticsData.departmentWorkload.map((entry, index) => {
                                const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} />
                        <RechartsLegend iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#475569' }} />
                    </PieChart>
                 </ResponsiveContainer>
             ) : (
                <EmptyState message="No workload data available" />
             )}
          </div>
        </div>
      </div>

      {/* Heads & Management */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 animate-fadeInUp space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="font-semibold text-sm text-slate-700">
            Heads & Management ({filteredLeadershipEmployees.length})
          </h2>
          {/* Slider controls placed in the header right corner */}
          {filteredLeadershipEmployees.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={scrollLeft}
                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition-all duration-200 active:scale-90 text-xs font-extrabold shadow-sm"
                title="Scroll Left"
              >
                &lt;
              </button>
              <button
                onClick={scrollRight}
                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition-all duration-200 active:scale-90 text-xs font-extrabold shadow-sm"
                title="Scroll Right"
              >
                &gt;
              </button>
            </div>
          )}
        </div>

        {filteredLeadershipEmployees.length === 0 ? (
          <EmptyState message="No leadership or management records found for this branch" />
        ) : (
          <div className="relative">
            {/* Scroll Container */}
            <div 
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto pb-3 pt-1 no-scrollbar scroll-smooth snap-x snap-mandatory px-1"
            >
              {filteredLeadershipEmployees.map((emp) => {
                const getInitialsForAvatar = (name) => {
                  if (!name) return "?";
                  const parts = name.split(" ");
                  if (parts.length > 1) {
                    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
                  }
                  return name.charAt(0).toUpperCase();
                };

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

                return (
                  <div
                    key={emp._id || emp.id}
                    onClick={() => navigate(`/employee/${emp._id || emp.id}`)}
                    className="flex-none w-72 snap-start bg-gradient-to-br from-white to-indigo-50/10 border border-indigo-100/80 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between h-48 relative group"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative flex-shrink-0">
                          {emp.avatar ? (
                            <img
                              src={emp.avatar.startsWith("http") ? emp.avatar : `${API_ORIGIN}${emp.avatar}`}
                              alt={emp.name}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-50 group-hover:scale-105 transition duration-300"
                              onError={(e) => {
                                e.currentTarget.src = "";
                                e.currentTarget.removeAttribute("src");
                              }}
                            />
                          ) : (
                            <div className={`w-10 h-10 bg-gradient-to-br ${colors[emp.department] || "from-indigo-500 to-purple-650"} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:scale-105 transition duration-300`}>
                              {getInitialsForAvatar(emp.name)}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-indigo-500 border-2 border-white rounded-full" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-800 text-sm tracking-tight truncate group-hover:text-blue-650 transition-colors duration-300">
                            {emp.name}
                          </h4>
                          <span className="text-[9px] font-bold text-indigo-500 tracking-wider uppercase block mt-0.5">
                            {emp.role?.replace(/-/g, " ")}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 p-2 bg-slate-50/80 group-hover:bg-indigo-50/20 rounded-xl border border-slate-100/80 transition-colors duration-300">
                        <div className="flex items-center gap-2 min-w-0 text-slate-500">
                          <svg className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs truncate">{emp.email || "No Email"}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0 text-slate-500">
                          <svg className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="text-xs truncate">{emp.phone || "Not Provided"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-indigo-50 pt-2.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>🏢 {emp.department}</span>
                      <span>📍 {emp.branch?.replace(" Branch", "")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Staff Directory */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 animate-fadeInUp space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h2 className="font-semibold text-sm text-slate-700">
            👥 Employees ({filteredStaffEmployees.length})
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            Page {currentPage} of {totalPages || 1}
          </span>
        </div>

        {filteredStaffEmployees.length === 0 ? (
          <EmptyState message="No employee records found matching your filters" />
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

      {/* Branches List */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 animate-fadeInUp">
        <h2 className="font-semibold text-sm mb-4 text-slate-700">📍 Branch Performance</h2>
        {branchStats.length === 0 ? (
          <EmptyState message="No branch performance statistics available" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {branchStats.map((b, i) => (
              <BranchCard
                key={b.name}
                branch={b}
                color={branchColors[i % branchColors.length]}
                isSelected={selectedBranch === b.name}
                onClick={() => setSelectedBranch(selectedBranch === b.name ? "all" : b.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Review Section */}
      {canReview && (
        <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 rounded-2xl p-5 border border-orange-200/80 animate-fadeInUp">
          <h2 className="font-semibold text-sm mb-3 text-slate-700">
            ⏳ Pending Reviews ({pendingSubmissions.length})
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
            {pendingSubmissions.slice(0, 5).map((t) => (
              <div
                key={t._id}
                className="bg-white rounded-xl p-3 border border-orange-100 flex justify-between items-center gap-3 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-xs text-slate-800 truncate">{t.title}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {t.assignedTo?.name} • {t.department}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTaskForReview(t)}
                  className="px-4 py-2 bg-purple-650 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-300"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal Dialog */}
      {selectedTaskForReview && createPortal(
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={(e) => e.target === e.currentTarget && !reviewLoading && setSelectedTaskForReview(null)}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl border border-slate-100 animate-scaleIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800">📋 Review Task</h3>
              <button
                onClick={() => {
                  setSelectedTaskForReview(null);
                  setReviewComment("");
                }}
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors duration-300"
              >
                ✕
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4">
              <p className="font-bold text-xs text-slate-800 leading-normal">{selectedTaskForReview.title}</p>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                Assigned: {selectedTaskForReview.assignedTo?.name} • {selectedTaskForReview.department}
              </p>
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
              rows={3}
              placeholder="Provide comments or feedback for this review..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleReview(selectedTaskForReview._id, "approved", reviewComment)}
                disabled={reviewLoading}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                ✅ Approve
              </button>
              <button
                onClick={() => handleReview(selectedTaskForReview._id, "rejected", reviewComment)}
                disabled={reviewLoading}
                className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-rose-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                ❌ Reject
              </button>
              <button
                onClick={() => {
                  setSelectedTaskForReview(null);
                  setReviewComment("");
                }}
                disabled={reviewLoading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.getElementById("modal-root") || document.body
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
