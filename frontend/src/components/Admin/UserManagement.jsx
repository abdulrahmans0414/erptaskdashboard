import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUsers,
  FiUserPlus,
  FiTrash2,
  FiEdit2,
  FiSearch,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiShield,
  FiAlertTriangle,
  FiMapPin,
  FiBriefcase,
  FiPhone,
  FiCalendar,
  FiLock,
  FiEye,
  FiEyeOff,
  FiGrid,
  FiCheckCircle,
  FiMail,
  FiHeart
} from "react-icons/fi";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getBranches,
  getTasks
} from "../../services/api";
import SearchableCombobox from "../Common/SearchableCombobox";
import toast from "react-hot-toast";

const ROLE_LABELS = {
  admin: "Admin",
  "department-head": "Department Head",
  hr: "HR",
  it: "IT Staff",
  graphic: "Graphic Designer",
  employee: "Employee",
  "branch-head": "Branch Head",
  coordinator: "Coordinator",
  mentor: "Mentor",
  teacher: "Teacher",
  student: "Student",
};

const ROLE_BADGE = {
  admin: "bg-indigo-50 text-indigo-700 border-indigo-100",
  "department-head": "bg-amber-50 text-amber-700 border-amber-100",
  "branch-head": "bg-sky-50 text-sky-700 border-sky-100",
  hr: "bg-purple-50 text-purple-700 border-purple-100",
  it: "bg-blue-50 text-blue-700 border-blue-100",
  graphic: "bg-pink-50 text-pink-700 border-pink-100",
  coordinator: "bg-cyan-50 text-cyan-700 border-cyan-100",
  mentor: "bg-emerald-50 text-emerald-700 border-emerald-100",
  teacher: "bg-teal-50 text-teal-700 border-teal-100",
  student: "bg-yellow-50 text-yellow-700 border-yellow-100",
  employee: "bg-slate-50 text-slate-700 border-slate-100",
};

const DEPT_BADGE = {
  IT: "bg-blue-50 text-blue-700 border-blue-100",
  HR: "bg-purple-50 text-purple-700 border-purple-100",
  Graphic: "bg-pink-50 text-pink-700 border-pink-100",
  Finance: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Academic: "bg-indigo-50 text-indigo-700 border-indigo-100",
  Marketing: "bg-amber-50 text-amber-700 border-amber-100",
  Legal: "bg-rose-50 text-rose-700 border-rose-100",
  Transport: "bg-cyan-50 text-cyan-700 border-cyan-100",
  Operations: "bg-slate-50 text-slate-700 border-slate-100",
};

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  department: "IT",
  branch: "Gaurabagh",
  employeeId: "",
  customFields: {},
  isActive: true,
};

const Field = React.memo(({ label, children, required }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-slate-500 font-semibold text-xs ml-1 block">
      {label} {required && <span className="text-red-500 font-bold">*</span>}
    </label>
    {children}
  </div>
));

Field.displayName = "Field";

// Memoized Table Row to prevent unnecessary list lag during updates
const UserTableRow = React.memo(({ user, index, isAdmin, onEdit, onDelete }) => {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
      className="hover:bg-slate-50/60 border-b border-slate-200 transition-colors bg-white"
    >
      <td className="py-3.5 px-5">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white grid place-items-center font-bold text-sm shadow-md shadow-sky-500/15 uppercase">
            {user.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate hover:text-blue-600 transition-colors">
              {user.name}
            </p>
            <p className="text-xs text-slate-500 truncate flex items-center gap-1">
              <FiMail className="opacity-70" /> {user.email}
            </p>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-5 text-sm font-semibold text-slate-600">
        {user.employeeId || "—"}
      </td>
      <td className="py-3.5 px-5">
        <span
          className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${DEPT_BADGE[user.department] || "bg-slate-50 text-slate-600 border-slate-200"}`}
        >
          {user.department || "—"}
        </span>
      </td>
      <td className="py-3.5 px-5 text-sm text-slate-600 whitespace-nowrap">
        <span className="flex items-center gap-1.5 text-slate-600">
          <FiMapPin className="text-slate-400 text-xs" /> {user.branch || "Gaurabagh"}
        </span>
      </td>
      <td className="py-3.5 px-5">
        <span
          className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${ROLE_BADGE[user.role] || "bg-slate-50 text-slate-600 border-slate-200"}`}
        >
          {ROLE_LABELS[user.role] || user.role}
        </span>
      </td>
      <td className="py-3.5 px-5">
        <span
          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${
            user.isActive !== false
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-rose-50 text-rose-700 border-rose-100"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${user.isActive !== false ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
          />
          {user.isActive !== false ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="py-3.5 px-5 text-right whitespace-nowrap">
        <div className="flex justify-end gap-1.5">
          <button
            onClick={() => onEdit(user)}
            className="inline-flex items-center gap-1.5 text-blue-650 hover:bg-blue-50 active:scale-95 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-transparent hover:border-blue-100"
          >
            <FiEdit2 size={13} /> Edit
          </button>
          {isAdmin && (
            <button
              onClick={() => onDelete(user)}
              className="inline-flex items-center gap-1.5 text-rose-650 hover:bg-rose-50 active:scale-95 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-transparent hover:border-rose-100"
            >
              <FiTrash2 size={13} /> Delete
            </button>
          )}
        </div>
      </td>
    </motion.tr>
  );
});

UserTableRow.displayName = "UserTableRow";

const UserManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { settings } = useSettings();
  const departments = useMemo(() => settings?.departments || ["IT"], [settings]);
  const branches = useMemo(() => settings?.branches || ["Gaurabagh"], [settings]);
  const roles = useMemo(() => [
    "admin",
    "department-head",
    "hr",
    "it",
    "graphic",
    "employee",
    "branch-head",
    "coordinator",
    "mentor",
    "teacher",
    "student",
  ], []);

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [userStats, setUserStats] = useState({ total: 0, active: 0, admins: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [dbBranches, setDbBranches] = useState([]);
  
  const finalBranches = useMemo(() => {
    return (dbBranches || []).length > 0 ? (dbBranches || []).map(b => b?.name).filter(Boolean) : (branches || []);
  }, [dbBranches, branches]);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Split-pane layout Right Tab state ("affiliation" | "tasks")
  const [activeRightTab, setActiveRightTab] = useState("affiliation");
  const [userTasks, setUserTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksSearchQuery, setTasksSearchQuery] = useState("");

  // Mobile layout step state
  const [mobileStep, setMobileStep] = useState(1);

  // Dynamic Banner Notification for validation inline errors
  const [bannerError, setBannerError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getUsers({
        page,
        limit: 10,
        search,
        role: roleFilter,
        branch: branchFilter
      });
      if (response.data.success) {
        setUsers(response.data.data);
        setPagination(response.data.pagination || { page: 1, pages: 1, total: response.data.data.length });
        if (response.data.stats) setUserStats(response.data.stats);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    }
    setLoading(false);
  }, [page, search, roleFilter, branchFilter]);

  const loadDbBranches = useCallback(async () => {
    try {
      const response = await getBranches();
      if (response.data.success) {
        setDbBranches(response.data.data);
      }
    } catch (e) {
      console.error("Failed to load branches in UserManagement:", e);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadDbBranches();
  }, [loadDbBranches]);

  // Read URL search query param if present on mount to interlink from Email Center
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, []);

  // Debounced search for users
  useEffect(() => {
    if (search === "") {
      if (page !== 1) setPage(1);
      else loadUsers();
      return;
    }
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else loadUsers();
    }, 450);
    return () => clearTimeout(timer);
  }, [search, loadUsers]);

  // Fetch tasks assigned to the user when editing
  useEffect(() => {
    const fetchUserTasks = async () => {
      if (!editingUser || !showModal || activeRightTab !== "tasks") {
        return;
      }
      setTasksLoading(true);
      try {
        const response = await getTasks({ assignedTo: editingUser._id });
        if (response.data.success) {
          setUserTasks(response.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load user tasks:", err);
      } finally {
        setTasksLoading(false);
      }
    };
    fetchUserTasks();
  }, [editingUser, showModal, activeRightTab]);

  const filteredUserTasks = useMemo(() => {
    if (!tasksSearchQuery.trim()) return userTasks;
    const q = tasksSearchQuery.toLowerCase().trim();
    return userTasks.filter(t => 
      t.title?.toLowerCase().includes(q) || 
      t.description?.toLowerCase().includes(q)
    );
  }, [userTasks, tasksSearchQuery]);

  const handleBranchChange = useCallback((nextBranch) => {
    if (!nextBranch) return;
    const branchObj = (dbBranches || []).find((br) => br?.name === nextBranch);
    const branchDepts = (branchObj && branchObj.departments && branchObj.departments.length > 0)
      ? branchObj.departments
      : (departments || []);
    setFormData((prev) => ({
      ...prev,
      branch: nextBranch,
      department: branchDepts[0] || "IT"
    }));
  }, [dbBranches, departments]);

  const handleDeptChange = useCallback((nextDept) => {
    setFormData((prev) => ({
      ...prev,
      department: nextDept
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setBannerError("");

    // Front-end validations
    if (!formData.name.trim()) {
      setBannerError("Name field is required.");
      setSubmitting(false);
      return;
    }
    if (!formData.email.trim()) {
      setBannerError("Email address is required.");
      setSubmitting(false);
      return;
    }
    if (!editingUser && !formData.password) {
      setBannerError("Password is required for new accounts.");
      setSubmitting(false);
      return;
    }

    try {
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await updateUser(editingUser._id, updateData);
        toast.success("✅ User updated successfully!");
      } else {
        await createUser(formData);
        toast.success("✅ User account created successfully!");
      }
      setShowModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      const msg = error.response?.data?.message || error.message || "Save operation failed";
      setBannerError(msg);
      toast.error(msg);
    }
    setSubmitting(false);
  };

  const handleDelete = useCallback(async (userToDelete) => {
    try {
      await deleteUser(userToDelete._id);
      setConfirmDelete(null);
      toast.success(`🗑️ User ${userToDelete.name} soft-deleted. Accessible in Recycle Bin.`);
      loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error.response?.data?.message || "Error deleting user");
    }
  }, [loadUsers]);


  const openCreate = useCallback(() => {
    setEditingUser(null);
    setFormData({
        ...EMPTY_FORM,
        department: departments[0] || "IT",
        branch: finalBranches[0] || "Gaurabagh"
    });
    setBannerError("");
    setShowPwd(false);
    setActiveRightTab("affiliation");
    setMobileStep(1);
    setShowModal(true);
  }, [departments, finalBranches]);

  const handleEditClick = useCallback((userToEdit) => {
    setEditingUser(userToEdit);
    setFormData({
      name: userToEdit.name || "",
      email: userToEdit.email || "",
      password: "",
      role: userToEdit.role || "employee",
      department: userToEdit.department || "IT",
      branch: userToEdit.branch || "Gaurabagh",
      employeeId: userToEdit.employeeId || "",
      customFields: userToEdit.customFields || {},
      isActive: userToEdit.isActive !== false,
    });
    setBannerError("");
    setShowPwd(false);
    setActiveRightTab("affiliation");
    setMobileStep(1);
    setShowModal(true);
  }, []);

  const departmentsForSelectedBranch = useMemo(() => {
    const b = formData.branch;
    if (!b) return (departments || []);

    const branchObj = (dbBranches || []).find((br) => br?.name === b);
    if (branchObj && branchObj.departments && branchObj.departments.length > 0) {
      return branchObj.departments;
    }
    return (departments || []);
  }, [formData.branch, dbBranches, departments]);

  const inputClass = "w-full px-3.5 h-11 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm placeholder-slate-400 text-slate-800 shadow-sm";

  // Combobox Formats
  const branchComboboxOptions = useMemo(() => {
    return (finalBranches || []).map(b => ({ value: b, label: b, subLabel: "Active Branch" }));
  }, [finalBranches]);

  const deptComboboxOptions = useMemo(() => {
    return (departmentsForSelectedBranch || []).map(d => ({ value: d, label: d, subLabel: "Department Section" }));
  }, [departmentsForSelectedBranch]);

  return (
    <div className="min-h-screen bg-transparent text-slate-800 antialiased subpixel-antialiased">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-7">
        
        {/* Modern Enterprise Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white grid place-items-center text-2xl shadow-lg shadow-blue-500/20">
              👥
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                User Management
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Configure corporate roles, branches, and monitor live workloads
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/admin/users/trash"
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-350 active:scale-95 text-slate-700 px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all text-sm"
            >
              ♻️ Recycle Bin
            </Link>
            {isAdmin && (
              <button
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-sky-500/10 transition-all text-sm"
              >
                <FiUserPlus size={16} /> Add User
              </button>
            )}
          </div>
        </div>

        {/* Premium Light Cards Statistics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Accounts", value: userStats.total, color: "text-slate-800", icon: <FiUsers className="text-slate-400" /> },
            { label: "Active Employees", value: userStats.active, color: "text-emerald-600", icon: <FiCheckCircle className="text-emerald-500/80" /> },
            { label: "Company Divisions", value: departments.length, color: "text-blue-600", icon: <FiBriefcase className="text-blue-500/80" /> },
            { label: "Active Branches", value: finalBranches.length, color: "text-indigo-650", icon: <FiMapPin className="text-indigo-500/80" /> },
            { label: "Global Admins", value: userStats.admins, color: "text-purple-600", icon: <FiShield className="text-purple-500/80" /> },
          ].map((s, idx) => (
            <div
              key={idx}
              className="relative overflow-hidden bg-white/70 border border-slate-100 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md group hover:border-slate-200 transition-all duration-300"
            >
              <div className="absolute right-3 top-3 opacity-20 group-hover:opacity-40 transition-opacity">
                {s.icon}
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold mt-1.5 tracking-tight ${s.color}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Premium Filter Controls Grid */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row gap-3 shadow-sm">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <FiSearch size={16} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, employee ID..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition placeholder-slate-400"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setPage(1) || setRoleFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
            >
              <option value="all">All Roles</option>
              {(roles || []).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            
            <select
              value={branchFilter}
              onChange={(e) => setPage(1) || setBranchFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
            >
              <option value="all">All Branches</option>
              {(finalBranches || []).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live List Representation */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 bg-slate-50 rounded-xl animate-pulse border border-slate-100"
              />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 py-20 text-center shadow-sm">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-slate-700 font-bold text-lg">No active users match filters</p>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              Change the search query or filters. Deleted users reside safely in the Recycle Bin.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                    <tr>
                      <th className="text-xs font-bold uppercase tracking-wider py-4 px-5">
                        User Profile / Contact
                      </th>
                      <th className="text-xs font-bold uppercase tracking-wider py-4 px-5">
                        ID
                      </th>
                      <th className="text-xs font-bold uppercase tracking-wider py-4 px-5">
                        Department
                      </th>
                      <th className="text-xs font-bold uppercase tracking-wider py-4 px-5">
                        Branch
                      </th>
                      <th className="text-xs font-bold uppercase tracking-wider py-4 px-5">
                        Designated Role
                      </th>
                      <th className="text-xs font-bold uppercase tracking-wider py-4 px-5">
                        Status
                      </th>
                      <th className="text-xs font-bold uppercase tracking-wider py-4 px-5 text-right">
                        Administrative Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(users || []).map((item, index) => (
                      <UserTableRow
                        key={item._id}
                        user={item}
                        index={index}
                        isAdmin={isAdmin}
                        onEdit={handleEditClick}
                        onDelete={setConfirmDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Advanced Pagination UI */}
              {pagination.pages > 1 && (
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between px-6">
                  <p className="text-xs text-slate-500">
                    Showing page {page} of {pagination.pages} ({pagination.total} entries total)
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition-colors"
                    >
                      ◀
                    </button>
                    {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                      const totalP = pagination.pages;
                      let p = totalP <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalP - 2 ? totalP - 4 + i : page - 2 + i;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-9 h-9 rounded-lg text-xs font-bold transition-all border ${page === p ? "bg-blue-600 border-blue-500 text-white shadow-md" : "bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-50"}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                      disabled={page === pagination.pages}
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition-colors"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="md:hidden space-y-3.5">
              {(users || []).map((item, index) => (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all duration-300 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white grid place-items-center font-bold text-sm uppercase">
                      {item.name?.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500 truncate">{item.email}</p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        item.isActive !== false
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-rose-50 text-rose-700 border-rose-100"
                      }`}
                    >
                      {item.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 text-[11px]">
                    <span className={`px-2.5 py-0.5 rounded-lg border font-semibold ${ROLE_BADGE[item.role] || "bg-slate-50 text-slate-600"}`}>
                      {ROLE_LABELS[item.role] || item.role}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-lg border font-semibold ${DEPT_BADGE[item.department] || "bg-slate-50 text-slate-600"}`}>
                      {item.department || "IT"}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg border border-slate-100 bg-slate-50 text-slate-600">
                      📍 {item.branch || "Gaurabagh"}
                    </span>
                  </div>

                  <div className="flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="flex-1 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition border border-blue-100"
                    >
                      ✏️ Edit
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setConfirmDelete(item)}
                        className="flex-1 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition border border-red-100"
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Clean Single-Column Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[99] overflow-y-auto antialiased">
            <div className="fixed inset-0" onClick={() => setShowModal(false)} />
            <motion.div
              initial={{ scale: 0.97, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.97, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.45 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-50 flex flex-col max-h-[92vh]"
            >
              {/* Header section with clean title */}
              <div className="flex justify-between items-center px-8 py-5 border-b border-slate-150 sticky top-0 bg-white z-20 flex-shrink-0">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    {editingUser ? "✏️ Edit Employee" : "👤 Add New Employee"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingUser ? "Update employee account details" : "Create a new employee profile"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-850 flex items-center justify-center transition"
                >
                  <FiX size={16} />
                </button>
              </div>

              {/* Dynamic Warning/Error Banner */}
              {bannerError && (
                <div className="bg-red-50 border-b border-red-100 text-red-650 px-6 py-2.5 text-xs font-semibold flex items-center gap-2 flex-shrink-0 animate-[slideUp_.25s_ease-out]">
                  <FiAlertTriangle size={13} className="flex-shrink-0 text-red-400" />
                  <span>{bannerError}</span>
                </div>
              )}

              {/* Simple Single-Column Form */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="overflow-y-auto flex-1 px-8 py-6 space-y-5">
                  {/* Name */}
                  <Field label="Name" required>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={inputClass}
                      placeholder="Employee full name"
                    />
                  </Field>

                  {/* Email Address */}
                  <Field label="Email Address" required>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={inputClass}
                      placeholder="corporate@domain.com"
                    />
                  </Field>

                  {/* Employee ID */}
                  <Field label="Employee ID">
                    <input
                      type="text"
                      placeholder="e.g. EMP1049"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      className={inputClass}
                    />
                  </Field>

                  {/* Account Password */}
                  <Field label={editingUser ? "Password" : "Password"} required={!editingUser}>
                    <div className="relative">
                      <input
                        type={showPwd ? "text" : "password"}
                        required={!editingUser}
                        placeholder={editingUser ? "Leave blank to keep unchanged" : "••••••••"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors"
                        tabIndex={-1}
                      >
                        {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </Field>

                  {/* Role */}
                  <Field label="Role" required>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className={inputClass}
                    >
                      {(roles || []).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r] || r}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {/* Branch */}
                  <SearchableCombobox
                    label="Branch"
                    options={branchComboboxOptions}
                    value={formData.branch}
                    onChange={handleBranchChange}
                    placeholder="Select branch..."
                    isClearable={false}
                  />

                  {/* Department */}
                  <SearchableCombobox
                    label="Department"
                    options={deptComboboxOptions}
                    value={formData.department}
                    onChange={handleDeptChange}
                    placeholder="Select department..."
                    isClearable={false}
                  />

                  {/* Status Toggle */}
                  <label className="flex items-center justify-between gap-3 cursor-pointer bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-2xl px-4 py-3.5 transition select-none">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Account Status</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Enable or disable employee system access</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500/20"
                    />
                  </label>
                </div>

                {/* Footer Controls */}
                <div className="flex gap-3 px-8 py-5 border-t border-slate-200 bg-slate-50 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition-all disabled:opacity-50 text-sm"
                  >
                    {submitting ? "Saving..." : editingUser ? "Save Changes" : "Create Employee"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;
