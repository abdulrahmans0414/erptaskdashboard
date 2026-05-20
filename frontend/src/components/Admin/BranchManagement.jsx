import { useState, useEffect } from "react";
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from "../../services/api";
import { useSettings } from "../../context/SettingsContext";

const BRANCH_NAMES = [
  "Gaurabagh",
  "Vikas Nagar",
  "Kalyanpur",
  "Kursi",
  "Hive",
  "Ring Road",
  "Muazzam Nagar",
  "Aziz Nagar",
];

const EMPTY_FORM = {
  name: "",
  code: "",
  location: "",
  address: "",
  city: "Lucknow",
  state: "Uttar Pradesh",
  pincode: "",
  phone: "",
  email: "",
  headName: "",
  headEmail: "",
  departments: [],
};

import toast from "react-hot-toast";

const BranchManagement = () => {
  const { settings } = useSettings();
  const allDepts = settings?.departments || [
    "IT", "HR", "Graphic", "Academic", "Finance", "Marketing", "Legal", "Transport", "Operations", "Admin"
  ];

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showToast = (message, type = "success") => {
    if (type === "success") toast.success(message);
    else toast.error(message);
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e) => e.key === "Escape" && setShowModal(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal]);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const response = await getBranches();
      if (response.data.success) setBranches(response.data.data);
    } catch (error) {
      console.error("Error loading branches:", error);
      showToast("Failed to load branches", "error");
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingBranch) {
        await updateBranch(editingBranch._id, formData);
        showToast("Branch updated");
      } else {
        await createBranch(formData);
        showToast("Branch created");
      }
      setShowModal(false);
      setEditingBranch(null);
      setFormData(EMPTY_FORM);
      loadBranches();
    } catch (error) {
      console.error("Error saving branch:", error);
      showToast(
        error.response?.data?.message || error.message || "Save failed",
        "error",
      );
    }
    setSubmitting(false);
  };

  const handleDelete = async (branch) => {
    try {
      await deleteBranch(branch._id);
      setConfirmDelete(null);
      showToast("Branch deleted");
      loadBranches();
    } catch (error) {
      console.error("Error deleting branch:", error);
      showToast("Error deleting branch", "error");
    }
  };

  const openCreate = () => {
    setEditingBranch(null);
    setFormData({
      ...EMPTY_FORM,
      departments: [],
    });
    setShowModal(true);
  };

  const openEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      location: branch.location || "",
      address: branch.address || "",
      city: branch.city || "",
      state: branch.state || "",
      pincode: branch.pincode || "",
      phone: branch.phone || "",
      email: branch.email || "",
      headName: branch.headName || "",
      headEmail: branch.headEmail || "",
      departments: branch.departments || [],
    });
    setShowModal(true);
  };

  const filtered = branches.filter((b) => {
    const q = search.toLowerCase();
    return (
      !q ||
      b.name?.toLowerCase().includes(q) ||
      b.code?.toLowerCase().includes(q) ||
      b.city?.toLowerCase().includes(q) ||
      b.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes scaleIn { from { opacity:0; transform:scale(.96) } to { opacity:1; transform:scale(1) } }
      `}</style>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center text-xl shadow-lg shadow-blue-200">
                🏢
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  Branch Management
                </h1>
                <p className="text-slate-500 text-sm">
                  Manage all organization branches
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[.98] text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-200/70 transition-all w-full sm:w-auto"
          >
            <span className="text-lg leading-none">+</span> Add Branch
          </button>
        </div>

        {/* Stats + search */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Total Branches",
              value: branches.length,
              color: "text-blue-600",
            },
            {
              label: "Cities",
              value: new Set(branches.map((b) => b.city).filter(Boolean)).size,
              color: "text-indigo-600",
            },
            {
              label: "With Head",
              value: branches.filter((b) => b.headName).length,
              color: "text-emerald-600",
            },
            {
              label: "Configured",
              value: branches.filter((b) => b.phone && b.email).length,
              color: "text-amber-600",
            },
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

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, city or location..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse"
              >
                <div className="h-5 w-2/3 bg-slate-200 rounded mb-3" />
                <div className="h-3 w-1/3 bg-slate-200 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-5/6 bg-slate-100 rounded" />
                  <div className="h-3 w-4/6 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 py-16 text-center">
            <div className="text-5xl mb-3">🏷️</div>
            <p className="text-slate-700 font-semibold">No branches found</p>
            <p className="text-slate-500 text-sm mt-1">
              {search
                ? "Try a different search term"
                : 'Click "Add Branch" to create your first one.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((branch, i) => (
              <div
                key={branch._id}
                style={{ animationDelay: `${i * 30}ms` }}
                className="group bg-white rounded-2xl shadow-sm border border-slate-200/70 p-5 hover:shadow-xl hover:-translate-y-0.5 hover:border-blue-200 transition-all duration-200 animate-[fadeIn_.4s_ease-out_both]"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 text-lg truncate">
                      {branch.name}
                    </h3>
                    <span className="inline-block mt-1 text-[11px] font-mono font-semibold tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                      {branch.code}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(branch)}
                      title="Edit"
                      className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setConfirmDelete(branch)}
                      title="Delete"
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-sm text-slate-600 space-y-1.5">
                  <p className="flex gap-2">
                    <span className="text-slate-400">📍</span>
                    <span className="truncate">
                      {branch.location || "Location not set"}
                    </span>
                  </p>
                  <p className="flex gap-2">
                    <span className="text-slate-400">🏙️</span>
                    <span className="truncate">
                      {branch.city || "—"}
                      {branch.state ? `, ${branch.state}` : ""}
                    </span>
                  </p>
                  <p className="flex gap-2">
                    <span className="text-slate-400">📞</span>
                    <span className="truncate">{branch.phone || "—"}</span>
                  </p>
                  <p className="flex gap-2">
                    <span className="text-slate-400">✉️</span>
                    <span className="truncate">{branch.email || "—"}</span>
                  </p>
                  {branch.headName && (
                    <p className="flex gap-2 pt-1 border-t border-slate-100 mt-2">
                      <span className="text-slate-400">👤</span>
                      <span className="truncate font-medium text-slate-700">
                        {branch.headName}
                      </span>
                    </p>
                  )}
                  {branch.manager && (
                    <p className="flex gap-2">
                      <span className="text-slate-400">🧑‍💼</span>
                      <span className="truncate">
                        {branch.manager?.name || "Manager assigned"}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-[fadeIn_.15s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-[scaleIn_.2s_ease-out]">
            <div className="text-4xl mb-2">⚠️</div>
            <h3 className="text-lg font-bold text-slate-900">Delete branch?</h3>
            <p className="text-sm text-slate-500 mt-1">
              This will permanently delete <strong>{confirmDelete.name}</strong>
              . This action cannot be undone.
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

      {/* Branch Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-[fadeIn_.15s_ease-out]"
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col animate-[scaleIn_.2s_ease-out]"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingBranch ? "Edit Branch" : "Add New Branch"}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingBranch
                    ? "Update branch details"
                    : "Fill in branch information"}
                </p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Branch Name" required>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={inputClass}
                    placeholder="Enter branch name (e.g. Gaurabagh Campus)"
                  />
                </Field>
                <Field label="Branch Code" required>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className={inputClass}
                    placeholder="GB, VN, KP..."
                    maxLength={5}
                  />
                </Field>
              </div>

              <Field label="Location">
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Area / landmark"
                />
              </Field>

              <Field label="Address">
                <textarea
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className={`${inputClass} resize-none`}
                  rows="2"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="City">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="State">
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Pincode">
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) =>
                      setFormData({ ...formData, pincode: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Email">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  🏢 Departments Mapping
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {allDepts.map((dept) => {
                    const checked = formData.departments?.includes(dept);
                    return (
                      <label
                        key={dept}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition ${
                          checked
                            ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const nextDepts = e.target.checked
                              ? [...(formData.departments || []), dept]
                              : (formData.departments || []).filter((d) => d !== dept);
                            setFormData({ ...formData, departments: nextDepts });
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/30"
                        />
                        {dept}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <Field label="Head Name">
                  <input
                    type="text"
                    value={formData.headName}
                    onChange={(e) =>
                      setFormData({ ...formData, headName: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Head Email">
                  <input
                    type="email"
                    value={formData.headEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, headEmail: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-medium transition shadow-lg shadow-blue-200/70"
                >
                  {submitting
                    ? "Saving..."
                    : editingBranch
                      ? "Update Branch"
                      : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const inputClass =
  "w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition";

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

export default BranchManagement;
