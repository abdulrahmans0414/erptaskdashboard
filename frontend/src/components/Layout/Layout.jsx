import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 selection:bg-blue-500/10 selection:text-blue-600 antialiased">
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
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="h-full w-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default Layout;
