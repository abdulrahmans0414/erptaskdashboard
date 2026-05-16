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
import Dashboard from "./components/Dashboard/Dashboard";
import Tasks from "./components/Tasks/Tasks";
import Reports from "./components/Performance/Reports";
import Login from "./components/Auth/Login";
import EmployeeProfile from "./components/Employee/EmployeeProfile";
import UserManagement from "./components/Admin/UserManagement";
import BranchManagement from "./components/Admin/BranchManagement";
import PendingRegistrations from "./components/Admin/PendingRegistrations";
import SystemSettings from "./components/Admin/SystemSettings";
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from "./components/Common/ErrorBoundary";
import { SettingsProvider } from "./context/SettingsContext";
import { useRealtimeSync } from "./hooks/useRealtimeSync";

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

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  useRealtimeSync(isAuthenticated);

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Layout><EmployeeProfile /></Layout></ProtectedRoute>} />
      <Route path="/employee/:id" element={<ManagerRoute><Layout><EmployeeProfile /></Layout></ProtectedRoute>} />
      
      {/* Admin-only */}
      <Route path="/admin/users" element={<AdminRoute><Layout><UserManagement /></Layout></AdminRoute>} />
      <Route path="/admin/branches" element={<AdminRoute><Layout><BranchManagement /></Layout></AdminRoute>} />
      <Route path="/admin/registrations" element={<AdminRoute><Layout><PendingRegistrations /></Layout></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><Layout><SystemSettings /></Layout></AdminRoute>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
