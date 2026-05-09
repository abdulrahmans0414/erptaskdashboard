import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";

const Layout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false,
  );
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 1023px)");

    const handleChange = (e) => {
      const mobile = e.matches;
      setIsMobile(mobile);
      // Ensure we never "carry" an open drawer across breakpoints
      setMobileOpen(false);
    };

    // initialize
    setIsMobile(mq.matches);
    setMobileOpen(false);

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handleChange);
      return () => mq.removeEventListener("change", handleChange);
    }

    // Safari/old browsers fallback
    mq.addListener(handleChange);
    return () => mq.removeListener(handleChange);
  }, []);

  // ✅ Memoized toggle function to prevent re-renders
  const handleToggleSidebar = useCallback(() => {
    const mobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches;

    if (mobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  }, []);

  // ✅ Close mobile sidebar when navigating
  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        user={user}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        isMobile={isMobile}
      />

      {/* Mobile backdrop */}
      {mobileOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-200"
          onClick={handleCloseMobile}
        />
      )}

      <div
        className="transition-all duration-300"
        style={{
          marginLeft: isMobile ? 0 : sidebarCollapsed ? 80 : 256,
        }}
      >
        <Header
          sidebarCollapsed={sidebarCollapsed}
          user={user}
          onToggleSidebar={handleToggleSidebar}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
        />
        <main className="p-3 sm:p-5 lg:p-6 mt-14 min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
