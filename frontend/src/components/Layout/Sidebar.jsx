import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5001/api")
  .replace(/\/api\/?$/, "");

// SVG icons for crisp rendering (no emoji jank)
const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  Lightning: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  Tasks: () => (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Reports: () => (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
    </svg>
  ),
  ChevronDown: ({ open }) => (
    <svg
      className={`w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Profile: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
};

export default function Sidebar({
  collapsed,
  setCollapsed,
  user,
  mobileOpen = false,
  setMobileOpen = () => {},
  isMobile = false,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const isAdmin = user?.role === "admin";
  const isDeptHead = user?.role === "department-head";
  const isBranchHead = user?.role === "branch-head";
  const canViewReports = isAdmin || isDeptHead || isBranchHead;

  const isPerformanceActive =
    location.pathname.startsWith("/tasks") ||
    location.pathname.startsWith("/reports");

  useEffect(() => {
    if (isPerformanceActive && !collapsed && !performanceOpen)
      setPerformanceOpen(true);
  }, [isPerformanceActive, collapsed, performanceOpen]);

  const handlePerformanceClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (collapsed && !isMobile) {
      setCollapsed(false);
      setPerformanceOpen(true);
      return;
    }
    setPerformanceOpen(!performanceOpen);
  };

  const closeMobile = () => setMobileOpen(false);
  const logoSrc = "/spis-logo.jpeg";

  // Shared active / inactive nav classes
  const navActive =
    "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30";
  const navInactive =
    "text-slate-400 hover:bg-white/8 hover:text-white";

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen z-40 flex flex-col
        bg-[#0d1117]
        text-white transition-all duration-300 ease-in-out
        ${isMobile
          ? `w-72 ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`
          : collapsed
            ? "w-20"
            : "w-64"
        }
      `}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800/20 via-transparent to-black/30 pointer-events-none" />

      {/* ── Logo Header ── */}
      <div className="relative flex items-center justify-between px-4 h-14 border-b border-white/[0.06] flex-shrink-0">
        {!collapsed || isMobile ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden">
              {logoFailed ? (
                <span className="text-base font-black text-blue-600">S</span>
              ) : (
                <img
                  src={logoSrc}
                  alt="SPIS"
                  className="w-full h-full object-contain p-0.5"
                  onError={() => setLogoFailed(true)}
                />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-[13px] font-bold leading-tight truncate text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                Scholars' Group
              </h1>
              <p className="text-[9px] text-slate-500 truncate tracking-wide">
                Management Portal
              </p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center mx-auto shadow-lg overflow-hidden">
            {logoFailed ? (
              <span className="text-base font-black text-blue-600">S</span>
            ) : (
              <img
                src={logoSrc}
                alt="S"
                className="w-full h-full object-contain p-0.5"
                onError={() => setLogoFailed(true)}
              />
            )}
          </div>
        )}

        {isMobile && (
          <button
            onClick={closeMobile}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors ml-auto"
            aria-label="Close sidebar"
          >
            <Icons.Close />
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="relative flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scroll">
        {/* Section label */}
        {(!collapsed || isMobile) && (
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em] px-3 pb-2">
            Main Menu
          </p>
        )}

        {/* Dashboard */}
        <NavLink
          to="/"
          end
          onClick={closeMobile}
          title={collapsed && !isMobile ? "Dashboard" : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
            ${isActive ? navActive : navInactive}
            ${collapsed && !isMobile ? "justify-center" : ""}`
          }
        >
          <Icons.Dashboard />
          {(!collapsed || isMobile) && <span>Dashboard</span>}
        </NavLink>

        {/* Performance dropdown */}
        <div>
          <button
            onClick={handlePerformanceClick}
            title={collapsed && !isMobile ? "Performance" : undefined}
            className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${collapsed && !isMobile ? "justify-center" : "justify-between"}
              ${isPerformanceActive && (collapsed || !performanceOpen) ? navActive : "text-slate-400 hover:bg-white/[0.06] hover:text-white"}`}
          >
            <div className="flex items-center gap-3">
              <Icons.Lightning />
              {(!collapsed || isMobile) && <span>Performance</span>}
            </div>
            {(!collapsed || isMobile) && (
              <Icons.ChevronDown open={performanceOpen} />
            )}
          </button>

          {(!collapsed || isMobile) && performanceOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-white/[0.07] space-y-0.5 pb-1">
              <NavLink
                to="/tasks"
                onClick={() => { setPerformanceOpen(true); closeMobile(); }}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 pl-2 pr-3 py-2 rounded-lg text-[13px] transition-all duration-150
                  ${isActive
                    ? "bg-white/10 text-white font-semibold"
                    : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]"
                  }`
                }
              >
                <Icons.Tasks />
                <span>Tasks</span>
              </NavLink>

              {canViewReports && (
                <NavLink
                  to="/reports"
                  onClick={() => { setPerformanceOpen(true); closeMobile(); }}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 pl-2 pr-3 py-2 rounded-lg text-[13px] transition-all duration-150
                    ${isActive
                      ? "bg-white/10 text-white font-semibold"
                      : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]"
                    }`
                  }
                >
                  <Icons.Reports />
                  <span>Reports</span>
                </NavLink>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* ── User Profile (Bottom) ── */}
      <div className="relative flex-shrink-0 border-t border-white/[0.06] p-3">
        <button
          onClick={() => { navigate("/profile"); closeMobile(); }}
          className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-150 hover:bg-white/[0.06] group
            ${collapsed && !isMobile ? "justify-center" : ""}`}
          title={collapsed && !isMobile ? user?.name : undefined}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {user?.avatar ? (
              <img
                src={user.avatar.startsWith("http") ? user.avatar : `${API_ORIGIN}${user.avatar}`}
                alt={user?.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-blue-500/40 transition-all"
              />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white/10 group-hover:ring-blue-500/40 transition-all">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
            {/* Online dot */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0d1117] rounded-full" />
          </div>

          {(!collapsed || isMobile) && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
                  {user?.name || "User"}
                </p>
                <p className="text-[10px] text-slate-500 truncate capitalize group-hover:text-slate-400 transition-colors">
                  {user?.role?.replace(/-/g, " ") || "Member"}
                </p>
              </div>
              <Icons.Profile />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
