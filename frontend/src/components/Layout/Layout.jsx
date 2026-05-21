import { useState, useEffect, useCallback, Suspense } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ErrorBoundary from "../Common/ErrorBoundary";

/**
 * Premium SaaS Layout Component
 * Engineered for 2026 Production Standards:
 * - GPU-Accelerated page transitions with micro-blur.
 * - Hardware-accelerated mobile backdrop exit animations.
 * - Isolated Page-level ErrorBoundary to prevent shell crashes.
 * - Targeted CSS transition properties (`transition-[padding-left]`) to eliminate paint sweeps and layout jitter.
 * - Fully reactive and SSR-safe media query handling.
 */
const Layout = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  });

  // Reactive and debounced-adjacent media query handling
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 1023px)");
    const handleChange = (e) => {
      setIsMobile(e.matches);
      // Auto-collapse drawer when viewport changes to prevent DOM occlusion
      setMobileOpen(false);
    };

    // Synchronize initial state
    setIsMobile(mq.matches);

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handleChange);
      return () => mq.removeEventListener("change", handleChange);
    }

    // Legacy fallback
    mq.addListener(handleChange);
    return () => mq.removeListener(handleChange);
  }, []);

  // Memoized interactive toggles to prevent parent state cascading
  const handleToggleSidebar = useCallback(() => {
    if (typeof window === "undefined") return;
    const mobile = window.matchMedia("(max-width: 1023px)").matches;

    if (mobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  }, []);

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 selection:bg-blue-500/10 selection:text-blue-600 subpixel-antialiased">
      {/* Left Navigation Shell */}
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        user={user}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        isMobile={isMobile}
      />

      {/* GPU-Accelerated Mobile Backdrop Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
            onClick={handleCloseMobile}
          />
        )}
      </AnimatePresence>

      {/* Main Content Workspace Wrapper */}
      {/* Note: Targeted transition properties avoid page-wide repaint lag. */}
      <div
        className="transition-[padding-left] duration-300 ease-in-out min-h-screen flex flex-col"
        style={{
          paddingLeft: isMobile ? 0 : sidebarCollapsed ? 80 : 256,
        }}
      >
        <Header
          sidebarCollapsed={sidebarCollapsed}
          user={user}
          onToggleSidebar={handleToggleSidebar}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
        />

        {/* Semantic Content Container with Micro-Animation and Isolated Error Recovery */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 mt-14 overflow-x-hidden">
          <ErrorBoundary>
            <Suspense fallback={<DashboardSkeleton />}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full w-full"
                >
                  {children || <Outlet />}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

/**
 * Premium Glassmorphic Dashboard Skeleton Loader
 * Designed to show high-end responsive shimmers instead of layout flashes.
 */
const DashboardSkeleton = () => (
  <div className="w-full space-y-6 animate-pulse p-1">
    {/* Top stats grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 bg-white/70 rounded-2xl border border-slate-100 p-5 flex flex-col justify-between shadow-sm">
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-8 bg-slate-300 rounded w-1/3"></div>
        </div>
      ))}
    </div>

    {/* Main dashboard splits */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="h-96 bg-white/70 rounded-3xl border border-slate-100 p-6 shadow-sm">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-12 bg-slate-200 rounded-xl w-full"></div>
            <div className="h-12 bg-slate-200 rounded-xl w-full"></div>
            <div className="h-12 bg-slate-200 rounded-xl w-full"></div>
          </div>
        </div>
      </div>
      <div className="h-96 bg-white/70 rounded-3xl border border-slate-100 p-6 shadow-sm">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default Layout;
