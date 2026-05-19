import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5001/api")
  .replace(/\/api\/?$/, "");

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
    location.pathname.startsWith("/mailbox") ||
    location.pathname.startsWith("/reports");

  useEffect(() => {
    if (isPerformanceActive && !collapsed && !performanceOpen)
      setPerformanceOpen(true);
  }, [isPerformanceActive, collapsed, performanceOpen]);

  const handlePerformanceClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // When sidebar is collapsed on desktop, clicking the icon should expand it
    // and open the dropdown (instead of doing nothing).
    if (collapsed && !isMobile) {
      setCollapsed(false);
      setPerformanceOpen(true);
      return;
    }
    setPerformanceOpen(!performanceOpen);
  };

  const closeMobile = () => setMobileOpen(false);
  const logoSrc = "/spis-logo.jpeg";

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen z-40 flex flex-col shadow-2xl
        bg-gradient-to-b from-slate-900 via-gray-900 to-slate-900
        text-white transition-all duration-300
        ${
          isMobile
            ? `w-64 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`
            : collapsed
              ? "w-20"
              : "w-64"
        }
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 min-h-[64px]">
        {!collapsed || isMobile ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden">
              {logoFailed ? (
                <span className="text-xl font-bold text-blue-600">S</span>
              ) : (
                <img
                  src={logoSrc}
                  alt="SPIS Logo"
                  className="w-full h-full object-contain p-1"
                  onError={() => setLogoFailed(true)}
                />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight truncate">SPIS</h1>
              <p className="text-[10px] text-gray-400 truncate" title="Scholars Paradise International School">
                Task Controller
              </p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto shadow-lg overflow-hidden">
            {logoFailed ? (
              <span className="text-xl font-bold text-blue-600">S</span>
            ) : (
              <img
                src={logoSrc}
                alt="S"
                className="w-full h-full object-contain p-1"
                onError={() => setLogoFailed(true)}
              />
            )}
          </div>
        )}

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={closeMobile}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300"
            aria-label="Close menu"
          >
            ✕
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <NavLink
          to="/"
          end
          onClick={closeMobile}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
            ${
              isActive
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }
            ${collapsed && !isMobile ? "justify-center" : ""}`
          }
          title={collapsed && !isMobile ? "Dashboard" : undefined}
        >
          <span className="text-lg flex-shrink-0">📊</span>
          {(!collapsed || isMobile) && <span>Dashboard</span>}
        </NavLink>

        {/* Performance dropdown */}
        <div>
          <button
            onClick={handlePerformanceClick}
            className={`w-full flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all
              ${collapsed && !isMobile ? "justify-center" : "justify-between"}
              ${
                isPerformanceActive
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            title={collapsed && !isMobile ? "Performance" : undefined}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg flex-shrink-0">⚡</span>
              {(!collapsed || isMobile) && <span>Performance</span>}
            </div>
            {(!collapsed || isMobile) && (
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${performanceOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </button>

          {(!collapsed || isMobile) && performanceOpen && (
            <div className="mt-1 ml-3 pl-3 border-l border-white/10 space-y-1">
              <NavLink
                to="/tasks"
                onClick={() => {
                  setPerformanceOpen(true);
                  closeMobile();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 pl-3 pr-4 py-2 rounded-lg text-sm transition
                  ${isActive ? "bg-white/10 text-white font-medium" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"}`
                }
              >
                <span>📋</span>
                <span>Tasks</span>
              </NavLink>

              <NavLink
                to="/mailbox"
                onClick={() => {
                  setPerformanceOpen(true);
                  closeMobile();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 pl-3 pr-4 py-2 rounded-lg text-sm transition
                  ${isActive ? "bg-white/10 text-white font-medium" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"}`
                }
              >
                <span>✉️</span>
                <span>Email Logs</span>
              </NavLink>

              {canViewReports && (
                <NavLink
                  to="/reports"
                  onClick={() => {
                    setPerformanceOpen(true);
                    closeMobile();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 pl-3 pr-4 py-2 rounded-lg text-sm transition
                    ${isActive ? "bg-white/10 text-white font-medium" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"}`
                  }
                >
                  <span>📈</span>
                  <span>Reports</span>
                </NavLink>
              )}
            </div>
          )}
        </div>

        {/* Admin Section (Hidden per user request) */}
        {/* {isAdmin && (
          <>
            {(!collapsed || isMobile) && (
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                  Administration
                </p>
              </div>
            )}
            {collapsed && !isMobile && (
              <div className="border-t border-white/10 my-2" />
            )}

            <NavLink
              to="/admin/users"
              onClick={closeMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40"
                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                }
                ${collapsed && !isMobile ? "justify-center" : ""}`
              }
              title={collapsed && !isMobile ? "User Management" : undefined}
            >
              <span className="text-lg flex-shrink-0">👥</span>
              {(!collapsed || isMobile) && <span>User Management</span>}
            </NavLink>

            <NavLink
              to="/admin/registrations"
              onClick={closeMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40"
                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                }
                ${collapsed && !isMobile ? "justify-center" : ""}`
              }
              title={collapsed && !isMobile ? "Registrations" : undefined}
            >
              <span className="text-lg flex-shrink-0">📋</span>
              {(!collapsed || isMobile) && <span>Registrations</span>}
            </NavLink>

            <NavLink
              to="/admin/settings"
              onClick={closeMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40"
                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                }
                ${collapsed && !isMobile ? "justify-center" : ""}`
              }
              title={collapsed && !isMobile ? "System Settings" : undefined}
            >
              <span className="text-lg flex-shrink-0">⚙️</span>
              {(!collapsed || isMobile) && <span>System Settings</span>}
            </NavLink>
          </>
        )} */}
      </nav>
      
      {/* User Profile Section at Bottom */}
      <div className="p-3 border-t border-white/10 mt-auto bg-black/20">
        <div 
          className={`flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-white/5 cursor-pointer
          ${collapsed && !isMobile ? "justify-center" : ""}`}
          onClick={() => {
            navigate("/profile");
            closeMobile();
          }}
        >
          {user?.avatar ? (
            <img
              src={`${API_ORIGIN}${user.avatar}`}
              alt=""
              className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow"
            />
          ) : (
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-500 truncate capitalize">
                {user?.role?.replace(/-/g, " ")}
              </p>
            </div>
          )}
          
          {(!collapsed || isMobile) && (
             <span className="text-gray-600 text-[10px]">👤</span>
          )}
        </div>
      </div>
    </aside>
  );
}

