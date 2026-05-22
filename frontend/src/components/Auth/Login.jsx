import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  signup,
  verifyOtp,
  checkRegStatus,
} from "../../services/api";
import { useSettings } from "../../context/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import { useDocumentMetadata } from "../../hooks/useDocumentMetadata";

// ─── Constants ────────────────────────────────────────────────
const DEPARTMENTS = [
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

const BRANCHES = [
  "Central Gaurabagh",
  "Vikas Nagar",
  "Hive",
  "Hifz Academy",
  "Kursi Road",
  "Muazzam Nagar",
  "Aziz Nagar",
  "Mailaraiganj",
];

const ROLES = [
  { value: "employee", label: "Employee" },
  { value: "hr", label: "HR Executive" },
  { value: "it", label: "IT Executive" },
  { value: "graphic", label: "Graphic Designer" },
  { value: "coordinator", label: "Coordinator" },
  { value: "mentor", label: "Mentor" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
];

const HIGH_PRIVILEGE_ROLES = [
  { value: "department-head", label: "Department Head" },
  { value: "branch-head", label: "Branch Head" },
];

const DEMO_ACCOUNTS = [
  {
    label: "Admin",
    email: "admin@example.com",
    password: "admin123",
    icon: "👑",
    color: "from-purple-500 to-purple-600",
  },
  {
    label: "HR",
    email: "hr@example.com",
    password: "hr123",
    icon: "👥",
    color: "from-blue-500 to-blue-600",
  },
  {
    label: "Branch Head",
    email: "abdul.habib@company.com",
    password: "branch123",
    icon: "🏢",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    label: "Dept Manager",
    email: "abdul.rahman@company.com",
    password: "manager123",
    icon: "👨‍💼",
    color: "from-orange-500 to-orange-600",
  },
];

// ─── Toast Notification ─────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: { bg: "from-emerald-500 to-emerald-600", icon: "✓" },
    error: { bg: "from-rose-500 to-rose-600", icon: "✕" },
    warning: { bg: "from-amber-500 to-amber-600", icon: "⚠" },
    info: { bg: "from-sky-500 to-sky-600", icon: "ℹ" },
  };

  const { bg, icon } = config[type] || config.info;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div
        className={`bg-gradient-to-r ${bg} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[320px] backdrop-blur-sm`}
      >
        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
          {icon}
        </span>
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// ─── Form Components ───────────────────────────────────────
const Input = ({ label, error, icon, ...props }) => (
  <div className="space-y-1.5">
    {label && (
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
          {icon}
        </span>
      )}
      <input
        className={`w-full px-3 py-2.5 ${icon ? "pl-9" : ""} border rounded-xl text-sm transition-all duration-200
          ${error ? "border-rose-500/50 bg-rose-950/20 text-rose-200 focus:ring-rose-500" : "border-slate-800 bg-slate-950/60 text-slate-100 focus:bg-slate-950 focus:ring-blue-500"}
          focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-slate-600`}
        {...props}
      />
    </div>
    {error && (
      <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
        ⚠ {error}
      </p>
    )}
  </div>
);

const Select = ({ label, options, error, ...props }) => (
  <div className="space-y-1.5">
    {label && (
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
    )}
    <select
      className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-slate-950/60 text-slate-100 transition-all duration-200
        ${error ? "border-rose-500/50" : "border-slate-800"}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value || opt} value={opt.value || opt} className="bg-slate-900 text-slate-100">
          {opt.label || opt}
        </option>
      ))}
    </select>
    {error && <p className="text-xs text-rose-400 font-medium">⚠ {error}</p>}
  </div>
);

const Button = ({
  children,
  variant = "primary",
  loading,
  className = "",
  ...props
}) => {
  const variants = {
    primary:
      "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-900/30",
    success:
      "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-900/30",
    outline:
      "border-2 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 text-slate-300",
    ghost: "hover:bg-slate-900 text-slate-400 hover:text-slate-200",
  };

  return (
    <button
      className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
        active:scale-[0.98] ${variants[variant]} ${className}`}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Processing...
        </>
      ) : (
        children
      )}
    </button>
  );
};

// ─── Password Strength Meter ────────────────────────────────
const PasswordStrength = ({ password }) => {
  const getStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getStrength(password);
  const levels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "bg-rose-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-emerald-600",
  ];
  const widths = ["w-1/5", "w-2/5", "w-3/5", "w-4/5", "w-full"];

  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[strength - 1] || "bg-rose-500"} ${widths[strength - 1] || "w-1/5"} rounded-full transition-all duration-300`}
        />
      </div>
      <p className="text-[10px] text-gray-500 font-medium">
        {levels[strength - 1] || "Very Weak"}
      </p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN AUTH PAGE
// ═══════════════════════════════════════════════════════════════
export default function AuthPage() {
  useDocumentMetadata({
    title: "Portal Access | Scholars' ERP Task Manager",
    description: "Secure enterprise gateway for Scholars' Group Of Institution. Manage branch operations, ACID-compliant workflows, and real-time task allocations.",
    noIndex: false,
    og: {
      title: "Portal Access | Scholars' ERP Task Manager",
      description: "Secure enterprise gateway for Scholars' Group Of Institution. Manage branch operations, ACID-compliant workflows, and real-time task allocations.",
      type: "website",
      image: "/spis-logo.jpeg",
    }
  });

  const { login: authLogin } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  
  const departments = settings?.departments || DEPARTMENTS;
  const branches = settings?.branches || BRANCHES;

  const otpInputRefs = useRef([]);

  // State
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Login
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  // Register
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    employeeId: "",
    designation: "",
    role: "employee",
    department: departments[0] || "IT",
    branch: branches[0] || "Gaurabagh",
    requestHighPrivilege: "no",
    requestedPrivilegeRole: "department-head",
    privilegeRequestReason: "",
  });
  const [errors, setErrors] = useState({});

  // Sync defaults when settings load
  useEffect(() => {
    if (settings?.departments?.length > 0 && !form.department) {
      setForm((prev) => ({ ...prev, department: settings.departments[0] }));
    }
    if (settings?.branches?.length > 0 && !form.branch) {
      setForm((prev) => ({ ...prev, branch: settings.branches[0] }));
    }
  }, [settings]);

  // OTP
  const [otpData, setOtpData] = useState({
    email: "",
    code: ["", "", "", "", "", ""],
  });
  const [otpError, setOtpError] = useState("");

  // Status
  const [statusData, setStatusData] = useState({ email: "", result: null });

  // ─── Helpers ─────────────────────────────────────────────────
  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const updateForm = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // ─── OTP Input Handler ─────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...otpData.code];
    newCode[index] = value;
    setOtpData((prev) => ({ ...prev, code: newCode }));
    setOtpError("");

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpData.code[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newCode = [...otpData.code];
    pasted.split("").forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });
    setOtpData((prev) => ({ ...prev, code: newCode }));
    if (pasted.length === 6) {
      otpInputRefs.current[5]?.focus();
    }
  };

  // ─── Validation ─────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = "Full name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Enter a valid email address";
    
    if (form.phone.trim()) {
      if (!/^\d{10}$/.test(form.phone.trim())) {
        newErrors.phone = "Phone must be exactly 10 digits";
      }
    }
    
    if (!form.employeeId.trim())
      newErrors.employeeId = "Employee ID is required";

    if (form.requestHighPrivilege === "yes") {
      if (!form.privilegeRequestReason.trim()) {
        newErrors.privilegeRequestReason =
          "Reason is required for Branch/Department Head request";
      } else if (form.privilegeRequestReason.trim().length < 10) {
        newErrors.privilegeRequestReason =
          "Please add a little more detail (min 10 chars)";
      }
    }

    if (!form.password) newErrors.password = "Password is required";
    else if (form.password.length < 6)
      newErrors.password = "At least 6 characters required";
    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = "Passwords don't match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Handlers ──────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      return showToast("error", "Please fill in all fields");
    }

    setLoading(true);
    try {
      const result = await authLogin(loginData.email, loginData.password);
      if (result.success) {
        showToast("success", "Welcome back! Redirecting...");
        setTimeout(() => navigate("/", { replace: true }), 800);
      } else {
        showToast("error", result.message || "Invalid credentials");
      }
    } catch (err) {
      showToast("error", "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { confirmPassword, ...rest } = form;
      const payload = {
        ...rest,
        role:
          rest.requestHighPrivilege === "yes"
            ? rest.requestedPrivilegeRole
            : rest.role,
        privilegeRequestReason:
          rest.requestHighPrivilege === "yes"
            ? rest.privilegeRequestReason
            : "",
      };
      const res = await signup(payload);
      if (res.data.success) {
        showToast(
          "success",
          "Registration submitted! Check email after approval.",
        );
        setForm({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
          employeeId: "",
          designation: "",
          role: "employee",
          department: settings?.departments?.[0] || DEPARTMENTS[0],
          branch: settings?.branches?.[0] || BRANCHES[0],
          requestHighPrivilege: "no",
          requestedPrivilegeRole: "department-head",
          privilegeRequestReason: "",
        });
        setOtpData((prev) => ({ ...prev, email: form.email }));
      }
    } catch (err) {
      showToast("error", err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    const code = otpData.code.join("");

    if (!otpData.email) {
      return setOtpError("Email is required");
    }
    if (code.length !== 6) {
      return setOtpError("Enter complete 6-digit OTP");
    }

    setLoading(true);
    try {
      const res = await verifyOtp(otpData.email, code);
      if (res.data.success) {
        const { token, ...userData } = res.data.data;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));
        showToast("success", "Account activated! Welcome aboard! 🎉");
        setTimeout(() => navigate("/", { replace: true }), 1000);
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid or expired OTP");
      setOtpData((prev) => ({ ...prev, code: ["", "", "", "", "", ""] }));
      otpInputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async (e) => {
    e.preventDefault();
    if (!statusData.email) return showToast("error", "Email is required");

    setLoading(true);
    try {
      const res = await checkRegStatus(statusData.email);
      setStatusData((prev) => ({ ...prev, result: res.data }));
      if (res.data.status === "otp_sent") {
        setOtpData((prev) => ({ ...prev, email: statusData.email }));
      }
    } catch (err) {
      showToast(
        "error",
        err.response?.data?.message || "Could not check status",
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demo) => {
    setLoginData({ email: demo.email, password: demo.password });
    setToast(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="relative min-h-screen bg-[#090D1A] flex flex-col justify-center items-center py-12 px-4 overflow-y-auto text-slate-100">
      
      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <motion.div
        layout
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full transition-all duration-300 flex flex-col justify-center items-center"
      >
        <div className={`w-full transition-all duration-300 flex flex-col justify-center ${mode === 'register' ? 'max-w-2xl' : 'max-w-md'}`}>
          {/* Brand */}
          <div className="text-center mb-6 flex flex-col items-center">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center justify-center w-14 h-14 bg-slate-900 rounded-2xl shadow-xl shadow-blue-950/20 mb-2 overflow-hidden border border-slate-800 cursor-pointer"
            >
              <img 
                src="/spis-logo.jpeg" 
                alt="Scholars Logo" 
                className="w-full h-full object-contain p-1.5"
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span class="text-2.5xl">🎓</span>';
                }}
              />
            </motion.div>
            <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 tracking-tight">
              Scholars' Group Of Institution
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1 font-extrabold">
              Task & Activity Controller
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-100">
                {mode === "login" && "Welcome Back 👋"}
                {mode === "register" && "Create Account"}
                {mode === "otp" && "Verify OTP"}
                {mode === "status" && "Check Status"}
              </h2>
              {mode === "login" && (
                <button
                  onClick={() => setMode("register")}
                  className="text-sm text-blue-400 hover:text-blue-300 font-semibold"
                >
                  Register →
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {mode === "login" && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  <form onSubmit={handleLogin} className="space-y-4">
                    <Input
                      label="Email or Employee ID"
                      type="text"
                      icon="👤"
                      placeholder="you@company.com or EMP-123"
                      value={loginData.email}
                      onChange={(e) =>
                        setLoginData((prev) => ({ ...prev, email: e.target.value }))
                      }
                    />

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Password
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                          🔒
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={loginData.password}
                          onChange={(e) =>
                            setLoginData((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          className="w-full pl-9 pr-10 py-2.5 border border-slate-800 bg-slate-950/60 text-slate-100 rounded-xl text-sm focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showPassword ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" loading={loading}>
                      🔐 Sign In
                    </Button>
                  </form>

                  {/* Demo Accounts */}
                  {import.meta.env.DEV && (
                    <div className="mt-6 pt-5 border-t border-slate-800">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">
                        Quick Demo Access
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {DEMO_ACCOUNTS.map((demo, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => fillDemoAccount(demo)}
                            title={`Login as ${demo.label} (${demo.email})`}
                            className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-800 hover:border-blue-500/50 hover:bg-blue-950/20 hover:shadow-sm transition-all group"
                          >
                            <div
                              className={`w-8 h-8 bg-gradient-to-br ${demo.color} rounded-lg flex items-center justify-center text-sm mb-1 shadow group-hover:scale-105 transition-transform`}
                            >
                              {demo.icon}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 truncate w-full text-center group-hover:text-blue-400">
                              {demo.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bottom Links */}
                  <div className="mt-6 space-y-2.5 text-center">
                    <button
                      onClick={() => setMode("otp")}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-medium"
                    >
                      Already approved? Verify OTP →
                    </button>
                    <br />
                    <button
                      onClick={() => setMode("status")}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-medium"
                    >
                      Check registration status
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ═══════ REGISTER MODE ═══════ */}
              {mode === "register" && (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <form onSubmit={handleRegister} className="space-y-4">
                    {/* Scrollable Form Container */}
                    <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                      
                      {/* Section: Personal Information */}
                      <div className="space-y-3 bg-slate-950/30 p-3 rounded-2xl border border-slate-800/60">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <span>👤</span> Personal Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            label="Full Name *"
                            placeholder="Abdul Rahman"
                            value={form.name}
                            onChange={updateForm("name")}
                            error={errors.name}
                          />
                          <Input
                            label="Email Address *"
                            type="email"
                            icon="📧"
                            placeholder="you@gmail.com"
                            value={form.email}
                            onChange={updateForm("email")}
                            error={errors.email}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            label="Phone (10 digits)"
                            type="tel"
                            placeholder="7607255678"
                            value={form.phone}
                            onChange={updateForm("phone")}
                            error={errors.phone}
                          />
                          <Input
                            label="Employee ID *"
                            placeholder="EMP-2024-001"
                            value={form.employeeId}
                            onChange={updateForm("employeeId")}
                            error={errors.employeeId}
                          />
                        </div>
                        <div>
                          <Input
                            label="Designation"
                            placeholder="e.g., Software Developer"
                            value={form.designation}
                            onChange={updateForm("designation")}
                          />
                        </div>
                      </div>

                      {/* Section: Corporate Mapping */}
                      <div className="space-y-3 bg-slate-950/30 p-3 rounded-2xl border border-slate-800/60">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <span>🏢</span> Corporate Mapping
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Select
                            label="Role *"
                            value={form.role}
                            onChange={updateForm("role")}
                            options={ROLES}
                          />
                          <Select
                            label="Department *"
                            value={form.department}
                            onChange={updateForm("department")}
                            options={departments.map((d) => ({
                              value: d,
                              label: d,
                            }))}
                          />
                          <Select
                            label="Branch *"
                            value={form.branch}
                            onChange={updateForm("branch")}
                            options={branches.map((b) => ({ value: b, label: b }))}
                          />
                        </div>
                      </div>

                      {/* Section: High privilege request flow */}
                      <div className="bg-amber-950/15 border border-amber-900/30 rounded-2xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                            <span>🔒</span> High-privilege Role Request (Optional)
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Select
                            label="Request Branch/Dept Head?"
                            value={form.requestHighPrivilege}
                            onChange={updateForm("requestHighPrivilege")}
                            options={[
                              { value: "no", label: "No" },
                              { value: "yes", label: "Yes (requires reason)" },
                            ]}
                          />
                          {form.requestHighPrivilege === "yes" ? (
                            <Select
                              label="Requested Privilege Role"
                              value={form.requestedPrivilegeRole}
                              onChange={updateForm("requestedPrivilegeRole")}
                              options={HIGH_PRIVILEGE_ROLES}
                            />
                          ) : (
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Requested Role
                              </label>
                              <div className="w-full px-3 py-2.5 border rounded-xl text-sm bg-slate-950/40 border-slate-900 text-slate-600">
                                Select “Yes” to request privilege
                              </div>
                            </div>
                          )}
                        </div>
                        {form.requestHighPrivilege === "yes" && (
                          <div className="animate-slide-down">
                            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                              <span>🔑</span> Strict Compliance Auditing: Reason for Elevating Privileges *
                            </label>
                            <textarea
                              value={form.privilegeRequestReason}
                              onChange={updateForm("privilegeRequestReason")}
                              rows={2.5}
                              className={`w-full mt-1.5 px-3 py-2 border rounded-xl text-sm transition-all duration-200
                                ${
                                  errors.privilegeRequestReason
                                    ? "border-rose-500/50 bg-rose-950/20 text-rose-200 focus:ring-rose-500"
                                    : "border-slate-800 bg-slate-950 text-slate-100 focus:ring-blue-500"
                                }
                                focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-slate-600`}
                              placeholder="Provide the enterprise justification and security clearance details."
                            />
                            {errors.privilegeRequestReason && (
                              <p className="text-xs text-rose-400 font-medium mt-1">
                                ⚠ {errors.privilegeRequestReason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Section: Account Security */}
                      <div className="space-y-3 bg-slate-950/30 p-3 rounded-2xl border border-slate-800/60">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <span>🔑</span> Security Credentials
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Input
                              label="Password *"
                              type="password"
                              placeholder="Min 6 characters"
                              value={form.password}
                              onChange={updateForm("password")}
                              error={errors.password}
                            />
                            <PasswordStrength password={form.password} />
                          </div>
                          <Input
                            label="Confirm Password *"
                            type="password"
                            placeholder="Repeat password"
                            value={form.confirmPassword}
                            onChange={updateForm("confirmPassword")}
                            error={errors.confirmPassword}
                          />
                        </div>
                      </div>

                    </div>

                    {/* Form Action Button */}
                    <Button type="submit" loading={loading} className="w-full py-3 mt-2">
                      📝 Submit Registration Request
                    </Button>
                  </form>

                  {/* Auxiliary Operations */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMode("otp")}
                      className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl hover:bg-slate-900/50 hover:border-slate-700 transition-all text-center"
                    >
                      <div className="text-xl mb-1">✉️</div>
                      <div className="text-xs font-semibold text-slate-300">
                        Verify OTP
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("status")}
                      className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl hover:bg-slate-900/50 hover:border-slate-700 transition-all text-center"
                    >
                      <div className="text-xl mb-1">🔍</div>
                      <div className="text-xs font-semibold text-slate-300">
                        Check Status
                      </div>
                    </button>
                  </div>

                  <p className="text-center text-xs text-slate-400 mt-2">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-blue-400 hover:text-blue-300 hover:underline font-semibold"
                    >
                      Sign in
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ═══════ OTP VERIFICATION MODE ═══════ */}
              {mode === "otp" && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="bg-gradient-to-r from-emerald-950/20 to-teal-950/20 border border-emerald-900/30 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📧</span>
                      <div>
                        <p className="text-sm font-semibold text-emerald-400">
                          Check Your Email
                        </p>
                        <p className="text-xs text-emerald-300/80 mt-1">
                          We've sent a 6-digit OTP to your email. Check spam folder if not found.
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleOtpVerify} className="space-y-5">
                    <Input
                      label="Your Email Address"
                      type="email"
                      icon="📧"
                      placeholder="you@gmail.com"
                      value={otpData.email}
                      onChange={(e) =>
                        setOtpData((prev) => ({ ...prev, email: e.target.value }))
                      }
                    />

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3 text-center">
                        Enter 6-Digit OTP
                      </label>
                      <div
                        className="flex gap-2 justify-center"
                        onPaste={handleOtpPaste}
                      >
                        {otpData.code.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => (otpInputRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all
                              ${otpError ? "border-rose-500/50 bg-rose-950/20 text-rose-200" : digit ? "border-blue-500/50 bg-blue-950/20 text-blue-200" : "border-slate-800 bg-slate-950 text-slate-100"}
                              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                          />
                        ))}
                      </div>
                      {otpError && (
                        <p className="text-xs text-rose-400 text-center mt-2 font-medium">
                          ⚠ {otpError}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="success"
                      loading={loading}
                      disabled={otpData.code.some((d) => !d)}
                    >
                      ✅ Verify & Activate Account
                    </Button>
                  </form>

                  <div className="mt-6 text-center space-y-3">
                    <p className="text-xs text-slate-400">
                      Didn't receive OTP?{" "}
                      <button
                        onClick={() => setMode("status")}
                        className="text-blue-400 hover:text-blue-300 hover:underline font-semibold"
                      >
                        Check status
                      </button>
                    </p>
                    <p className="text-xs text-slate-400">
                      <button
                        onClick={() => setMode("login")}
                        className="text-blue-400 hover:text-blue-300 hover:underline font-semibold"
                      >
                        ← Back to Sign In
                      </button>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ═══════ STATUS CHECK MODE ═══════ */}
              {mode === "status" && (
                <motion.div
                  key="status"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  <form onSubmit={handleCheckStatus} className="space-y-4">
                    <Input
                      label="Your Email Address"
                      type="email"
                      icon="📧"
                      placeholder="you@gmail.com"
                      value={statusData.email}
                      onChange={(e) =>
                        setStatusData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                    <Button type="submit" loading={loading} variant="outline">
                      🔍 Check Status
                    </Button>
                  </form>

                  {statusData.result && (
                    <div className="mt-6 space-y-4 animate-fade-in">
                      <div
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold
                        ${
                          statusData.result.status === "approved"
                            ? "bg-emerald-950/45 text-emerald-400 border border-emerald-900/30"
                            : statusData.result.status === "pending"
                              ? "bg-amber-950/45 text-amber-400 border border-amber-900/30"
                              : statusData.result.status === "otp_sent"
                                ? "bg-blue-950/45 text-blue-400 border border-blue-900/30"
                                : statusData.result.status === "rejected"
                                  ? "bg-rose-950/45 text-rose-400 border border-rose-900/30"
                                  : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {statusData.result.status === "approved" &&
                          "✅ Account Active"}
                        {statusData.result.status === "pending" &&
                          "⏳ Under Review"}
                        {statusData.result.status === "otp_sent" && "📧 OTP Sent"}
                        {statusData.result.status === "rejected" && "❌ Rejected"}
                        {statusData.result.status === "not_found" && "🔍 Not Found"}
                      </div>

                      {statusData.result.status === "not_found" && (
                        <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-4 text-blue-300">
                          <p className="text-sm">
                            No registration found. Please register first.
                          </p>
                        </div>
                      )}
                      {statusData.result.status === "pending" && (
                        <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4 text-amber-300">
                          <p className="text-sm">
                            Your request is under admin review. You'll receive an email when approved.
                          </p>
                        </div>
                      )}
                      {statusData.result.status === "otp_sent" && (
                        <div className="space-y-3">
                          <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4 text-emerald-300">
                            <p className="text-sm">
                              Admin has approved! Check your email for OTP.
                            </p>
                          </div>
                          <Button variant="success" onClick={() => setMode("otp")}>
                            Go to OTP Verification →
                          </Button>
                        </div>
                      )}
                      {statusData.result.status === "approved" && (
                        <div className="space-y-3">
                          <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4 text-emerald-300">
                            <p className="text-sm">
                              Account is active! You can sign in now.
                            </p>
                          </div>
                          <Button onClick={() => setMode("login")}>
                            Go to Sign In →
                          </Button>
                        </div>
                      )}
                      {statusData.result.status === "rejected" && (
                        <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-4 text-rose-300">
                          <p className="text-sm">
                            {statusData.result.message ||
                              "Registration was rejected. Please contact admin."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-center text-xs text-slate-400 mt-4">
                    <button
                      onClick={() => setMode("login")}
                      className="text-blue-400 hover:text-blue-300 hover:underline font-semibold"
                    >
                      ← Back to Sign In
                    </button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Centered Footer Copyright */}
          <div className="text-center mt-8 space-y-1">
            <p className="text-xs text-slate-500 font-medium">
              TaskGrid ERP v2.0 • © 2026 Scholars' Group Of Institution
            </p>
            <p className="text-[10px] text-slate-400/80 font-bold uppercase tracking-widest">
              Developed By Abdul Rahman
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
