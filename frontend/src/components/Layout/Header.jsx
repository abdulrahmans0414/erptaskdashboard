import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../Notifications/NotificationBell";
import { useNavigate } from "react-router-dom";
import { getPendingRegistrations } from "../../services/api";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5001/api")
  .replace(/\/api\/?$/, "");

const Header = ({
  sidebarCollapsed,
  user,
  onToggleSidebar,
  isMobile,
  mobileOpen,
}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const [showMenu, setShowMenu] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setShowMenu(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;
    const load = async () => {
      try {
        const r = await getPendingRegistrations();
        if (r.data.success)
          setPendingCount(r.data.count || r.data.data?.length || 0);
      } catch {}
    };
    load();
    const id = setInterval(load, 45000);
    return () => clearInterval(id);
  }, [user?.role]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "admin";
  const isBranchHead = user?.role === "branch-head";
  const isDeptHead = user?.role === "department-head";

  return (
    <header
      className="bg-white/90 backdrop-blur-xl border-b border-slate-200/70 fixed top-0 right-0 left-0 lg:left-auto z-30 transition-all duration-300 h-14 shadow-sm"
      style={!isMobile ? { left: sidebarCollapsed ? 80 : 256 } : {}}
    >
      <div className="px-3 sm:px-5 lg:px-6 h-full flex items-center justify-between gap-3">
        {/* LEFT: Collapse button + page title */}
        <div className="flex items-center gap-2 min-w-0">
          {/* COLLAPSE/SIDEBAR TOGGLE BUTTON - YAHI ADD KIYA HAI */}
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-1 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span className="lg:hidden text-sm font-bold text-gray-800 truncate">
            Scholars' Group Of Institution
          </span>
        </div>

        {/* RIGHT: actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isAdmin && pendingCount > 0 && (
            <button
              onClick={() => navigate("/admin/registrations")}
              className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg hover:from-red-100 hover:to-orange-100 transition"
              title="Pending Registrations"
            >
              <span>📋</span>
              <span className="hidden sm:inline">Pending</span>
              <span className="bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            </button>
          )}

          <NotificationBell />

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-1.5 sm:px-2 py-1.5 hover:bg-gray-100 rounded-xl transition"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar.startsWith("http") ? user.avatar : `${API_ORIGIN}${user.avatar}`}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow"
                  alt={user?.name}
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}

              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">
                  {user?.name || "User"}
                </p>
                <p className="text-[10px] text-gray-400 capitalize truncate max-w-[120px]">
                  {user?.role?.replace(/-/g, " ") || "Role"}
                </p>
              </div>

              <svg
                className="w-4 h-4 text-gray-400 transition-transform hidden md:block"
                style={{ transform: showMenu ? "rotate(180deg)" : "" }}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    {user?.avatar ? (
                      <img
                        src={user.avatar.startsWith("http") ? user.avatar : `${API_ORIGIN}${user.avatar}`}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow"
                      />
                    ) : (
                      <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow">
                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {user?.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full capitalize font-semibold">
                      {user?.role?.replace(/-/g, " ")}
                    </span>
                    {user?.department && (
                      <span className="bg-white text-gray-600 text-[10px] px-2 py-0.5 rounded-full border border-gray-200">
                        {user.department}
                      </span>
                    )}
                    {user?.branch && (
                      <span className="bg-white text-gray-600 text-[10px] px-2 py-0.5 rounded-full border border-gray-200">
                        📍 {user.branch}
                      </span>
                    )}
                  </div>
                </div>

                <div className="py-1.5">
                  <MenuItem
                    icon="👤"
                    onClick={() => {
                      navigate("/profile");
                      setShowMenu(false);
                    }}
                  >
                    My Profile
                  </MenuItem>

                  {isAdmin && (
                    <>
                      <MenuDivider label="Admin Panel" />
                      <MenuItem
                        icon="👥"
                        onClick={() => {
                          navigate("/admin/users");
                          setShowMenu(false);
                        }}
                      >
                        User Management
                      </MenuItem>
                      <MenuItem
                        icon="🏢"
                        onClick={() => {
                          navigate("/admin/branches");
                          setShowMenu(false);
                        }}
                      >
                        Branch Management
                      </MenuItem>
                      <MenuItem
                        icon="📋"
                        onClick={() => {
                          navigate("/admin/registrations");
                          setShowMenu(false);
                        }}
                        right={
                          pendingCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                              {pendingCount}
                            </span>
                          )
                        }
                      >
                        Pending Approvals
                      </MenuItem>
                      <MenuItem
                        icon="⚙️"
                        onClick={() => {
                          navigate("/admin/settings");
                          setShowMenu(false);
                        }}
                      >
                        System Settings
                      </MenuItem>
                    </>
                  )}

                  {(isBranchHead || isDeptHead) && (
                    <>
                      <MenuDivider />
                      <MenuItem
                        icon="👥"
                        onClick={() => {
                          navigate("/admin/users");
                          setShowMenu(false);
                        }}
                      >
                        View My Team
                      </MenuItem>
                      {isBranchHead && (
                        <MenuItem
                          icon="🏢"
                          onClick={() => {
                            navigate("/admin/branches");
                            setShowMenu(false);
                          }}
                        >
                          Branch Management
                        </MenuItem>
                      )}
                    </>
                  )}

                  <MenuDivider />
                  <MenuItem icon="🚪" danger onClick={handleLogout}>
                    Sign Out
                  </MenuItem>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const MenuItem = ({ icon, children, right, danger, ...props }) => (
  <button
    {...props}
    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition ${
      danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
    }`}
  >
    <span className="text-base">{icon}</span>
    <span className="flex-1">{children}</span>
    {right}
  </button>
);

const MenuDivider = ({ label }) => (
  <div className="px-3 pt-2 pb-1">
    {label && (
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        {label}
      </p>
    )}
    {!label && <div className="border-t border-gray-100" />}
  </div>
);

export default Header;
