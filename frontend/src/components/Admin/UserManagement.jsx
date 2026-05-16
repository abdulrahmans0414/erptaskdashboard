import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../services/api";

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
  admin: "bg-red-100 text-red-700 border-red-200",
  "department-head": "bg-orange-100 text-orange-700 border-orange-200",
  "branch-head": "bg-indigo-100 text-indigo-700 border-indigo-200",
  hr: "bg-purple-100 text-purple-700 border-purple-200",
  it: "bg-blue-100 text-blue-700 border-blue-200",
  graphic: "bg-pink-100 text-pink-700 border-pink-200",
  coordinator: "bg-cyan-100 text-cyan-700 border-cyan-200",
  mentor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  teacher: "bg-teal-100 text-teal-700 border-teal-200",
  student: "bg-yellow-100 text-yellow-700 border-yellow-200",
  employee: "bg-slate-100 text-slate-700 border-slate-200",
};

const DEPT_BADGE = {
  IT: "bg-blue-100 text-blue-700 border-blue-200",
  HR: "bg-purple-100 text-purple-700 border-purple-200",
  Graphic: "bg-pink-100 text-pink-700 border-pink-200",
  Finance: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Academic: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Marketing: "bg-amber-100 text-amber-700 border-amber-200",
  Legal: "bg-rose-100 text-rose-700 border-rose-200",
  Transport: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Operations: "bg-slate-100 text-slate-700 border-slate-200",
};

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  department: "IT",
  branch: "Gaurabagh",
  phone: "",
  address: "",
  bloodGroup: "",
  dateOfJoining: new Date().toISOString().split('T')[0],
  employeeId: "",
  customFields: {},
  isActive: true,
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  const styles =
    type === "success"
      ? "bg-emerald-600"
      : type === "error"
        ? "bg-red-600"
        : "bg-slate-800";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-medium ${styles} animate-[slideUp_.25s_ease-out]`}
    >
      <span>{type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}</span>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 opacity-70 hover:opacity-100 text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
};

const Field = ({ label, children, required }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-semibold text-slate-700 ml-0.5">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
  </div>
);

const UserManagement = () => {
  const { settings } = useSettings();
  const departments = settings?.departments || ["IT"];
  const branches = settings?.branches || ["Gaurabagh"];
  const roles = [
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
  ];

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e) => e.key === "Escape" && setShowModal(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await getUsers();
      if (response.data.success) setUsers(response.data.data);
    } catch (error) {
      console.error("Error loading users:", error);
      showToast("Failed to load users", "error");
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await updateUser(editingUser._id, updateData);
        showToast("User updated");
      } else {
        await createUser(formData);
        showToast("User created");
      }
      setShowModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      showToast(
        error.response?.data?.message || error.message || "Save failed",
        "error",
      );
    }
    setSubmitting(false);
  };

  const handleDelete = async (user) => {
    try {
      await deleteUser(user._id);
      setConfirmDelete(null);
      showToast("User deleted");
      loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast("Error deleting user", "error");
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setFormData({
        ...EMPTY_FORM,
        department: departments[0] || "IT",
        branch: branches[0] || "Gaurabagh"
    });
    setShowPwd(false);
    setShowModal(true);
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "", 
      role: user.role || "employee",
      department: user.department || "IT",
      branch: user.branch || "Gaurabagh",
      phone: user.phone || "",
      address: user.address || "",
      bloodGroup: user.bloodGroup || "",
      dateOfJoining: user.dateOfJoining ? user.dateOfJoining.split('T')[0] : new Date().toISOString().split('T')[0],
      employeeId: user.employeeId || "",
      customFields: user.customFields || {},
      isActive: user.isActive !== false,
    });
    setShowPwd(false);
    setShowModal(true);
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (branchFilter !== "all" && (u.branch || "Gaurabagh") !== branchFilter)
        return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.employeeId?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.branch?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter, branchFilter]);

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes scaleIn { from { opacity:0; transform:scale(.96) } to { opacity:1; transform:scale(1) } }
      `}</style>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center text-xl shadow-lg shadow-blue-200">
              👥
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                User Management
              </h1>
              <p className="text-slate-500 text-sm">
                Add, edit, or remove employees
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[.98] text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-200/70 transition-all w-full sm:w-auto"
          >
            <span className="text-lg leading-none">+</span> Add User
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Users", value: users.length, color: "text-slate-900" },
            { label: "Active", value: users.filter((u) => u.isActive !== false).length, color: "text-emerald-600" },
            { label: "Departments", value: departments.length, color: "text-blue-600" },
            { label: "Branches", value: branches.length, color: "text-indigo-600" },
            { label: "Admins", value: users.filter((u) => u.role === "admin").length, color: "text-purple-600" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white border border-slate-200/70 rounded-2xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200/70 rounded-2xl p-3 flex flex-col md:flex-row gap-2 shadow-sm">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, role, department..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
          >
            <option value="all">All Roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-slate-100 rounded-xl animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 py-16 text-center">
            <div className="text-5xl mb-3">🧑‍💼</div>
            <p className="text-slate-700 font-semibold">No users found</p>
            <p className="text-slate-500 text-sm mt-1">
              Try adjusting your filters or add a new user.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/70 border-b border-slate-200">
                    <tr>
                      <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4">
                        User Info
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4">
                        Employee ID
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4">
                        Department
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4">
                        Branch
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4">
                        Role
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4">
                        Status
                      </th>
                      <th className="text-right text-xs font-semibold text-slate-600 uppercase tracking-wider py-3 px-4">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((user, i) => (
                      <tr
                        key={user._id}
                        style={{ animationDelay: `${i * 20}ms` }}
                        className="hover:bg-blue-50/40 transition-colors animate-[fadeIn_.3s_ease-out_both]"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white grid place-items-center font-bold text-sm shadow-sm shadow-blue-200">
                              {user.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-700">
                          {user.employeeId || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium border ${DEPT_BADGE[user.department] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                          >
                            {user.department || "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                          📍 {user.branch || "Gaurabagh"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium border ${ROLE_BADGE[user.role] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                          >
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${
                              user.isActive !== false
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : "bg-red-100 text-red-700 border-red-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${user.isActive !== false ? "bg-emerald-500" : "bg-red-500"}`}
                            />
                            {user.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg text-sm font-medium transition mr-1"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete(user)}
                            className="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-sm font-medium transition"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:hidden space-y-3">
              {filtered.map((user, i) => (
                <div
                  key={user._id}
                  style={{ animationDelay: `${i * 25}ms` }}
                  className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm animate-[fadeIn_.4s_ease-out_both]"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white grid place-items-center font-bold shadow-sm shadow-blue-200">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {user.email} {user.employeeId && `· ${user.employeeId}`}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium border flex-shrink-0 ${
                            user.isActive !== false
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-red-100 text-red-700 border-red-200"
                          }`}
                        >
                          {user.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${ROLE_BADGE[user.role] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                        >
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${DEPT_BADGE[user.department] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                        >
                          {user.department || "—"}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          📍 {user.branch || "Gaurabagh"}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="flex-1 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(user)}
                          className="flex-1 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-[fadeIn_.15s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-[scaleIn_.2s_ease-out]">
            <div className="text-4xl mb-2">⚠️</div>
            <h3 className="text-lg font-bold text-slate-900">Delete user?</h3>
            <p className="text-sm text-slate-500 mt-1">
              Permanently delete <strong>{confirmDelete.name}</strong>? This
              cannot be undone.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition shadow-md shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-[fadeIn_.15s_ease-out]"
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col animate-[scaleIn_.2s_ease-out]"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingUser ? "Edit User" : "Add New User"}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="h-9 w-9 grid place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 text-2xl transition"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="overflow-y-auto px-6 py-5 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Name" required>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Employee ID">
                <input
                  type="text"
                  placeholder="e.g. EMP123"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className={inputClass}
                />
              </Field>

              {!editingUser && (
                <Field label="Password" required>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 px-2 py-1 text-sm"
                      tabIndex={-1}
                    >
                      {showPwd ? "🙈" : "👁️"}
                    </button>
                  </div>
                </Field>
              )}

              {editingUser && (
                <Field label="Update Password">
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      placeholder="Leave blank to keep current"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 px-2 py-1 text-sm"
                      tabIndex={-1}
                    >
                      {showPwd ? "🙈" : "👁️"}
                    </button>
                  </div>
                </Field>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Phone Number">
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Blood Group">
                  <input
                    type="text"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Home Address">
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={inputClass}
                  rows="2"
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Role" required>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className={inputClass}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Date of Joining" required>
                  <input
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Department" required>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className={inputClass}
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Branch" required>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className={inputClass}
                  >
                    {branches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Dynamic Custom Fields */}
              {settings?.userCustomFields?.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h4 className="text-sm font-bold text-slate-800">
                    Additional Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {settings.userCustomFields.map((field) => (
                      <Field key={field.id} label={field.label} required={field.required}>
                        <input
                          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                          required={field.required}
                          value={formData?.customFields?.[field.id] || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customFields: {
                                ...(formData.customFields || {}),
                                [field.id]: e.target.value,
                              },
                            })
                          }
                          className={inputClass}
                        />
                      </Field>
                    ))}
                  </div>
                </div>
              )}

              {editingUser && (
                <label className="flex items-center justify-between gap-2 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-700">Account Active</p>
                    <p className="text-xs text-slate-500">User can log in when active</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              )}

              <div className="flex gap-3 pt-6 sticky bottom-0 bg-white border-t border-slate-100 py-4 mt-auto">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-200 transition-all active:scale-[.98] disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingUser ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
