import { lazy, Suspense } from "react";
import { Provider } from "react-redux";
import { store } from "./store/store";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout/Layout";
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from "./components/Common/ErrorBoundary";
import { SettingsProvider } from "./context/SettingsContext";
import { useRealtimeSync } from "./hooks/useRealtimeSync";

const Dashboard = lazy(() => import("./components/Dashboard/Dashboard"));
const Tasks = lazy(() => import("./components/Tasks/Tasks"));
const Reports = lazy(() => import("./components/Performance/Reports"));
const Login = lazy(() => import("./components/Auth/Login"));
const EmployeeProfile = lazy(() => import("./components/Employee/EmployeeProfile"));
const UserManagement = lazy(() => import("./components/Admin/UserManagement"));
const BranchManagement = lazy(() => import("./components/Admin/BranchManagement"));
const PendingRegistrations = lazy(() => import("./components/Admin/PendingRegistrations"));
const SystemSettings = lazy(() => import("./components/Admin/SystemSettings"));

const Spinner = () => (
  <div className="flex justify-center items-center h-screen bg-slate-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  </div>
);

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  // Only show spinner on initial load if no user data yet
  if (loading && !user) return <Spinner />;
  return user ? <Navigate to="/" replace /> : children;
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  // Silent refresh: don't block UI if user data already exists
  if (loading && !user) return <Spinner />;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading && !user) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === "admin" ? children : <Navigate to="/" replace />;
};

const ManagerRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading && !user) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return ["admin", "branch-head", "department-head"].includes(user.role) ? (
    children
  ) : (
    <Navigate to="/" replace />
  );
};

const BranchHeadRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading && !user) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return ["admin", "branch-head"].includes(user.role) ? (
    children
  ) : (
    <Navigate to="/" replace />
  );
};

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  useRealtimeSync(isAuthenticated);

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        
        {/* Persistent Shared Layout Shell */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<EmployeeProfile />} />
          <Route path="/employee/:id" element={<ManagerRoute><EmployeeProfile /></ManagerRoute>} />
          
          {/* Managed & Admin Routes */}
          <Route path="/admin/users" element={<ManagerRoute><UserManagement /></ManagerRoute>} />
          <Route path="/admin/branches" element={<BranchHeadRoute><BranchManagement /></BranchHeadRoute>} />
          <Route path="/admin/registrations" element={<AdminRoute><PendingRegistrations /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><SystemSettings /></AdminRoute>} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <SettingsProvider>
          <AuthProvider>
            <Toaster 
              position="bottom-right"
              toastOptions={{
                duration: 3000,
                style: {
                  borderRadius: '10px',
                  background: '#333',
                  color: '#fff',
                  fontSize: '14px',
                },
                success: { style: { background: '#10b981' } },
                error: { style: { background: '#ef4444' } }
              }}
            />
            <Router>
              <AppRoutes />
            </Router>
          </AuthProvider>
        </SettingsProvider>
      </Provider>
    </ErrorBoundary>
  );
}
