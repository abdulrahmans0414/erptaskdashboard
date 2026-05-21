import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getUsers,
  updateUser,
  getDeletedBranches,
  restoreBranch,
} from "../../services/api";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

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
  head: "",
  manager: "",
};

// Searchable Combobox Selector for Head/Manager
const Combobox = ({ label, value, onChange, options, placeholder, icon }) => {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = (options || []).find((opt) => opt?._id === value);
  const filteredOptions = (options || []).filter(
    (opt) =>
      opt?.name?.toLowerCase().includes(search.toLowerCase()) ||
      opt?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative flex-1">
      <label className="text-slate-500 font-medium text-xs mb-1.5 ml-1 block">
        {label}
      </label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition cursor-pointer flex justify-between items-center min-h-[38px] shadow-sm"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-400 flex-shrink-0">{icon || "👤"}</span>
          {selectedOption ? (
            <div className="flex items-center gap-2 min-w-0">
              {selectedOption.avatar ? (
                <img 
                  src={selectedOption.avatar} 
                  alt="" 
                  className="w-5 h-5 rounded-full object-cover border border-slate-200 flex-shrink-0" 
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                  {selectedOption.name?.substring(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium text-slate-800 truncate">
                {selectedOption.name}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-xs truncate">{placeholder}</span>
          )}
        </div>
        <span className="text-slate-400 text-[10px] select-none pl-1">▼</span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto p-2 space-y-1"
            >
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 mb-2 placeholder-slate-400 transition"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              <div className="overflow-y-auto max-h-40 custom-scrollbar space-y-0.5">
                {filteredOptions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-3 select-none">
                    No users found
                  </p>
                ) : (
                  filteredOptions.map((opt) => (
                    <div
                      key={opt._id}
                      onClick={() => {
                        onChange(opt._id);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition text-xs ${
                        value === opt._id 
                          ? "bg-blue-50 text-blue-700 font-semibold" 
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      {opt.avatar ? (
                        <img 
                          src={opt.avatar} 
                          alt="" 
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 flex-shrink-0" 
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {opt.name?.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold truncate leading-tight">{opt.name}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{opt.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const BranchManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { settings } = useSettings();
  const allDepts = settings?.departments || [
    "IT", "HR", "Graphic", "Academic", "Finance", "Marketing", "Legal", "Transport", "Operations", "Admin"
  ];

  const [branches, setBranches] = useState([]);
  const [deletedBranches, setDeletedBranches] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [mobileStep, setMobileStep] = useState(1);
  
  // Tab control in split-pane
  const [activeTab, setActiveTab] = useState("depts"); // depts | staff
  const [staffSearch, setStaffSearch] = useState("");
  
  // Banner notifications error state
  const [bannerError, setBannerError] = useState(null);

  // Transfer Employee States
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferEmployee, setTransferEmployee] = useState(null);
  const [transferForm, setTransferForm] = useState({ targetBranch: "", targetDept: "" });
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  const showToast = (message, type = "success") => {
    if (type === "success") toast.success(message);
    else toast.error(message);
  };

  const loadUsersList = async () => {
    try {
      const response = await getUsers({ limit: 1000 });
      if (response.data.success) {
        setAllUsers(response.data.data);
      }
    } catch (error) {
      console.error("Error loading users in BranchManagement:", error);
    }
  };

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

  const loadDeletedBranches = async () => {
    try {
      const response = await getDeletedBranches();
      if (response.data.success) setDeletedBranches(response.data.data);
    } catch (error) {
      console.error("Error loading deleted branches:", error);
    }
  };

  useEffect(() => {
    loadBranches();
    loadUsersList();
    loadDeletedBranches();
  }, []);

  useEffect(() => {
    if (!showModal && !showTransferModal && !confirmDelete) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setShowModal(false);
        setShowTransferModal(false);
        setTransferEmployee(null);
        setConfirmDelete(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal, showTransferModal, confirmDelete]);

  const handleOpenTransferModal = (emp) => {
    setTransferEmployee(emp);
    setTransferForm({
      targetBranch: emp.branch || "",
      targetDept: emp.department || "",
    });
    setShowTransferModal(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferEmployee || !transferForm.targetBranch || !transferForm.targetDept) {
      showToast("Please fill in all transfer fields", "error");
      return;
    }
    setTransferSubmitting(true);
    try {
      const res = await updateUser(transferEmployee._id, {
        branch: transferForm.targetBranch,
        department: transferForm.targetDept
      });
      if (res.data.success) {
        showToast(`Successfully transferred ${transferEmployee.name} to ${transferForm.targetBranch}`);
        setShowTransferModal(false);
        setTransferEmployee(null);
        loadBranches();
        loadUsersList();
      } else {
        showToast(res.data.message || "Transfer failed", "error");
      }
    } catch (error) {
      console.error("Error transferring employee:", error);
      showToast(error.response?.data?.message || error.message || "Transfer failed", "error");
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setBannerError(null);
    try {
      // Sync head name/email based on loaded combobox selection
      const payload = { ...formData };
      if (payload.head) {
        const headUser = (allUsers || []).find(u => u?._id === payload.head);
        if (headUser) {
          payload.headName = headUser.name;
          payload.headEmail = headUser.email;
        }
      }

      if (editingBranch) {
        await updateBranch(editingBranch._id, payload);
        showToast("Branch updated successfully");
      } else {
        await createBranch(payload);
        showToast("Branch created successfully");
      }
      setShowModal(false);
      setEditingBranch(null);
      setFormData(EMPTY_FORM);
      setBannerError(null);
      loadBranches();
      loadUsersList();
    } catch (error) {
      console.error("Error saving branch:", error);
      const errMsg = error.response?.data?.message || error.message || "Operation failed";
      setBannerError(errMsg);
      // Scroll to modal top to display error banner clearly
      const scrollableForm = document.getElementById("modal-scrollable-pane");
      if (scrollableForm) scrollableForm.scrollTop = 0;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (branch) => {
    try {
      await deleteBranch(branch._id);
      setConfirmDelete(null);
      showToast("Branch moved to Recycle Bin");
      loadBranches();
      loadDeletedBranches();
      loadUsersList();
    } catch (error) {
      console.error("Error soft-deleting branch:", error);
      showToast("Error deleting branch", "error");
    }
  };

  const handleRestore = async (id) => {
    try {
      const response = await restoreBranch(id);
      if (response.data.success) {
        showToast("Branch successfully restored from Recycle Bin");
        loadBranches();
        loadDeletedBranches();
        loadUsersList();
        // Auto refresh bin count
        const nextBin = (deletedBranches || []).filter((b) => b?._id !== id);
        setDeletedBranches(nextBin);
      }
    } catch (error) {
      console.error("Error restoring branch:", error);
      showToast(error.response?.data?.message || "Failed to restore branch", "error");
    }
  };

  const openCreate = () => {
    setEditingBranch(null);
    setFormData({
      ...EMPTY_FORM,
      departments: [],
    });
    setBannerError(null);
    setActiveTab("depts");
    setMobileStep(1);
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
      head: branch.head?._id || branch.head || "",
      manager: branch.manager?._id || branch.manager || "",
    });
    setBannerError(null);
    setActiveTab("depts");
    setMobileStep(1);
    setShowModal(true);
  };

  const filtered = (branches || []).filter((b) => {
    const q = search.toLowerCase();
    return (
      !q ||
      b?.name?.toLowerCase().includes(q) ||
      b?.code?.toLowerCase().includes(q) ||
      b?.city?.toLowerCase().includes(q) ||
      b?.location?.toLowerCase().includes(q)
    );
  });

  // Get active members assigned to the editing branch
  const activeMembers = (allUsers || []).filter(u => 
    u?.branch && 
    editingBranch?.name && 
    u.branch.trim().toLowerCase() === editingBranch.name.trim().toLowerCase() &&
    u?.role !== 'admin' &&
    u?.isActive !== false &&
    u?.isArchived !== true
  );

  const filteredMembers = (activeMembers || []).filter(emp => 
    !staffSearch ||
    emp?.name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
    emp?.email?.toLowerCase().includes(staffSearch.toLowerCase()) ||
    emp?.department?.toLowerCase().includes(staffSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-blue-200">
              🏢
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Branch Management
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Configure ERP organizational branches, departments, and active employee structures.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isAdmin && (
              <>
                <Link
                  to="/admin/branches/trash"
                  className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-medium shadow-sm hover:shadow transition-all w-full sm:w-auto"
                >
                  <span>🗑️</span> Recycle Bin 
                  {deletedBranches.length > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold ml-1">
                      {deletedBranches.length}
                    </span>
                  )}
                </Link>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openCreate}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-blue-200 transition-all w-full sm:w-auto"
                >
                  <span className="text-lg leading-none">+</span> Add Branch
                </motion.button>
              </>
            )}
          </div>
        </div>

        {/* Stats dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Active Branches",
              value: branches.length,
              color: "text-blue-600",
              bgColor: "bg-blue-50/50",
              icon: "🏢",
            },
            {
              label: "Configured Cities",
              value: new Set((branches || []).map((b) => b?.city).filter(Boolean)).size,
              color: "text-indigo-600",
              bgColor: "bg-indigo-50/50",
              icon: "📍",
            },
            {
              label: "Branches with Head",
              value: (branches || []).filter((b) => b?.headName || b?.head).length,
              color: "text-emerald-600",
              bgColor: "bg-emerald-50/50",
              icon: "👤",
            },
            {
              label: "Complete Settings",
              value: (branches || []).filter((b) => b?.phone && b?.email).length,
              color: "text-amber-600",
              bgColor: "bg-amber-50/50",
              icon: "⚙️",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
                <p className={`text-3xl font-extrabold tracking-tight ${s.color}`}>
                  {s.value}
                </p>
              </div>
              <div className={`h-11 w-11 rounded-xl ${s.bgColor} flex items-center justify-center text-xl`}>
                {s.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by branch name, code, location city, or landmark..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition shadow-sm"
          />
        </div>

        {/* Core Branch grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl border border-slate-200 p-5 animate-pulse space-y-4"
              >
                <div className="h-6 w-2/3 bg-slate-200 rounded-lg" />
                <div className="h-4 w-1/3 bg-slate-200 rounded-md" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-5/6 bg-slate-100 rounded" />
                  <div className="h-3 w-4/6 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-dashed border-slate-200 py-16 text-center shadow-sm"
          >
            <div className="text-6xl mb-4">🏬</div>
            <p className="text-slate-700 font-bold text-lg">No Active Branches Found</p>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              {search
                ? "We couldn't find any branch matching your search. Try resetting the text filter."
                : 'Get started by creating your first business branch card using the "Add Branch" action.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((branch, i) => (
              <motion.div
                layoutId={`branch-${branch._id}`}
                key={branch._id}
                className="group bg-white rounded-3xl shadow-sm border border-slate-200 p-5 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-lg truncate leading-tight group-hover:text-blue-600 transition-colors">
                        {branch.name}
                      </h3>
                      <span className="inline-block mt-2 text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100/50">
                        {branch.code}
                      </span>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(branch)}
                          title="Edit branch mapping matrix"
                          className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-slate-400 transition"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setConfirmDelete(branch)}
                          title="Soft-delete branch (Archive)"
                          className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-slate-600 space-y-2">
                    <p className="flex gap-2 min-w-0 items-start">
                      <span className="text-slate-400">📍</span>
                      <span className="truncate" title={branch.location}>
                        {branch.location || "Location landmark not configured"}
                      </span>
                    </p>
                    <p className="flex gap-2 min-w-0 items-center">
                      <span className="text-slate-400">🏙️</span>
                      <span className="truncate">
                        {branch.city || "—"}{branch.state ? `, ${branch.state}` : ""}
                      </span>
                    </p>
                    <p className="flex gap-2 min-w-0 items-center">
                      <span className="text-slate-400">📞</span>
                      <span className="truncate">{branch.phone || "—"}</span>
                    </p>
                    <p className="flex gap-2 min-w-0 items-center">
                      <span className="text-slate-400">✉️</span>
                      <span className="truncate" title={branch.email}>{branch.email || "—"}</span>
                    </p>

                    {/* Populated Heads / Managers display */}
                    {(() => {
                      const headObj = typeof branch?.head === 'object' ? branch.head : null;
                      const headName = (typeof (headObj?.name || branch?.headName) === 'string') ? (headObj?.name || branch.headName) : '';
                      const headEmail = (typeof (headObj?.email || branch?.headEmail) === 'string') ? (headObj?.email || branch.headEmail) : '';
                      const managerObj = typeof branch?.manager === 'object' ? branch.manager : null;
                      const managerName = (typeof managerObj?.name === 'string') ? managerObj?.name : '';
                      
                      const isSame = headName && managerName && headName.trim().toLowerCase() === managerName.trim().toLowerCase();
                      
                      if (isSame) {
                        return (
                          <div className="pt-2 border-t border-slate-100 mt-3" title="Combined branch authority">
                            <p className="flex gap-2 items-center text-slate-700">
                              <span className="text-slate-400">👤</span>
                              <span className="truncate font-bold">
                                Head & Manager: {headName}
                              </span>
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div className="pt-2 border-t border-slate-100 mt-3 space-y-1.5">
                          {headName && (
                            <p className="flex gap-2 items-center text-slate-700" title="Branch Head / Representative">
                              <span className="text-slate-400">👤</span>
                              <span className="truncate font-semibold text-slate-750">
                                Head: {headName}
                              </span>
                            </p>
                          )}
                          {managerName && (
                            <p className="flex gap-2 items-center text-slate-700" title="Operations Manager">
                              <span className="text-slate-400">🧑‍💼</span>
                              <span className="truncate font-semibold text-slate-750">
                                Manager: {managerName}
                              </span>
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Real-time Employee Listing */}
                    {(() => {
                      const branchUsers = (allUsers || []).filter(u => 
                        typeof u?.branch === 'string' && 
                        typeof branch?.name === 'string' &&
                        u.branch.trim().toLowerCase() === branch.name.trim().toLowerCase() &&
                        u?.role !== 'admin' &&
                        u?.isActive !== false &&
                        u?.isArchived !== true
                      );
                      return (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Branch Staff ({branchUsers.length})
                            </span>
                          </div>
                          {branchUsers.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-1">No active staff assigned</p>
                          ) : (
                            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                              {branchUsers.map((emp) => {
                                const initials = emp.name ? emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
                                return (
                                  <div key={emp._id} className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/60 p-2 rounded-xl border border-slate-200/50 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {emp.avatar ? (
                                        <img src={emp.avatar} alt={emp.name} className="w-7 h-7 rounded-full object-cover border border-slate-200 flex-shrink-0" />
                                      ) : (
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                                          {initials}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 truncate" title={emp.name}>{emp.name}</p>
                                        <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                                          <span className="px-1 py-0.2 rounded bg-slate-200/80 text-slate-600 text-[8px] uppercase tracking-wide font-bold">{emp.department}</span>
                                          <span className="truncate capitalize">• {emp?.role?.replace('-', ' ') || ""}</span>
                                        </p>
                                      </div>
                                    </div>
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleOpenTransferModal(emp)}
                                        title={`Reassign/Transfer ${emp.name}`}
                                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition active:scale-95 text-xs flex-shrink-0"
                                      >
                                        🔄
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>



      {/* Confirm Soft-Delete Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="fixed inset-0" onClick={() => setConfirmDelete(null)} />
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md z-50 border border-slate-100"
            >
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mb-3">
                ⚠️
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Archive branch?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                This will soft-delete and hide the branch <strong>{confirmDelete.name}</strong> from the main view.
                All active departments, staff members, and active task catalogs linked exclusively to this branch will be placed in an archived/hidden state. You can restore this structure fully at any time from the Recycle Bin.
              </p>
              <div className="flex gap-2.5 mt-5">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition shadow-md shadow-red-100"
                >
                  Archive Branch
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* High-Fidelity Split-Pane Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm lg:flex lg:items-center lg:justify-center lg:p-4 z-50">
            <div className="fixed inset-0 lg:block hidden" onClick={() => setShowModal(false)} />
            <motion.div
              initial={{ scale: 0.97, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.97, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.45 }}
              className="bg-white w-full h-full fixed inset-0 z-50 flex flex-col overflow-y-auto lg:relative lg:inset-auto lg:h-auto lg:max-h-[85vh] lg:w-full lg:max-w-5xl lg:rounded-3xl lg:shadow-2xl lg:overflow-hidden lg:border lg:border-slate-100 lg:z-50"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 flex-shrink-0">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {editingBranch ? "Edit Branch Configuration" : "Add New Branch"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="lg:hidden font-bold text-blue-600 block mb-1">
                      Step {mobileStep} of 2: {mobileStep === 1 ? "Core Details" : "Allowed Departments / Staff"}
                    </span>
                    {editingBranch
                      ? `Configure mapping settings for branch card: ${editingBranch.name}`
                      : "Initialize new business branch structures and assign active departments."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-9 w-9 grid place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 text-2xl transition"
                >
                  ×
                </button>
              </div>

              {/* Form Content in Dual Columns */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                  
                  {/* Left Column - Standard inputs (Scrollable) */}
                  <div 
                    id="modal-scrollable-pane"
                    className={`w-full lg:w-5/12 overflow-y-auto px-6 py-5 border-r border-slate-100 space-y-6 custom-scrollbar bg-slate-50/30 lg:block ${mobileStep === 1 ? "block" : "hidden"}`}
                  >
                    {/* Elegant Absolute Banner Notification */}
                    <AnimatePresence>
                      {bannerError && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="bg-red-50 border-l-4 border-red-500 rounded-xl p-3.5 text-xs text-red-800 leading-relaxed flex gap-3 items-start shadow-sm"
                        >
                          <span className="text-base select-none">❌</span>
                          <div className="flex-1">
                            <strong className="font-bold block">Save Error Raised</strong>
                            <span className="mt-0.5 block opacity-90">{bannerError}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setBannerError(null)}
                            className="text-red-400 hover:text-red-700 font-bold ml-1"
                          >
                            ×
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5.5">
                      <Field label="Branch Name" required>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className={inputClass}
                          placeholder="e.g. Gaurabagh"
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
                          placeholder="e.g. GB"
                          maxLength={5}
                        />
                      </Field>
                    </div>

                    <Field label="Location Landmark">
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        className={inputClass}
                        placeholder="Street landmark, area"
                      />
                    </Field>

                    <Field label="Complete Address">
                      <textarea
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        className={`${inputClass} resize-none`}
                        rows="2"
                        placeholder="Detailed company address..."
                      />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5.5">
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
                          placeholder="Landline / support"
                        />
                      </Field>
                    </div>

                    <Field label="Email Address">
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className={inputClass}
                        placeholder="branch@company.com"
                      />
                    </Field>

                    {/* Advanced Combobox Dropdown selectors displaying avatars */}
                    <div className="flex flex-col sm:flex-row gap-5.5 pt-2">
                      <Combobox
                        label="Branch Head / Representative"
                        value={formData.head}
                        onChange={(val) => setFormData({ ...formData, head: val })}
                        options={allUsers}
                        placeholder="Select branch head..."
                        icon="👤"
                      />
                      <Combobox
                        label="Operations Manager"
                        value={formData.manager}
                        onChange={(val) => setFormData({ ...formData, manager: val })}
                        options={allUsers}
                        placeholder="Select manager..."
                        icon="🧑‍💼"
                      />
                    </div>
                  </div>

                  {/* Right Column - Tabbed Details (Mapping & Members) */}
                  <div className={`w-full lg:w-7/12 flex flex-col bg-white lg:flex ${mobileStep === 2 ? "flex flex-col flex-1" : "hidden"}`}>
                    
                    {/* Tab controls */}
                    <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTab("depts")}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 relative ${
                          activeTab === "depts" 
                            ? "bg-white text-blue-600 shadow-sm border border-slate-200/50" 
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <span>📂</span> Allowed Departments
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("staff")}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 relative ${
                          activeTab === "staff" 
                            ? "bg-white text-blue-600 shadow-sm border border-slate-200/50" 
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <span>👥</span> Active Members ({editingBranch ? activeMembers.length : 0})
                      </button>
                    </div>

                    {/* Tab Content Panes */}
                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                      {activeTab === "depts" && (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="bg-blue-50/40 rounded-xl p-3 border border-blue-100/50">
                            <p className="text-[11px] text-blue-700 leading-relaxed">
                              💡 <strong>Allowed Matrix:</strong> Check the departments allowed to operate inside this branch. Unchecking a department with active staff or pending tasks will trigger a backend mapping error block to prevent data corruption.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            {(allDepts || []).map((dept) => {
                              const checked = (formData.departments || [])?.includes(dept);
                              return (
                                <label
                                  key={dept}
                                  className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border text-xs font-semibold cursor-pointer transition select-none ${
                                    checked
                                      ? "bg-blue-50/50 border-blue-200 text-blue-700 font-bold shadow-sm"
                                      : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
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
                                    className="w-4.5 h-4.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500/20"
                                  />
                                  {dept}
                                </label>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}

                      {activeTab === "staff" && (
                        <motion.div 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          {!editingBranch ? (
                            <div className="text-center py-12 space-y-2">
                              <span className="text-5xl block">🆕</span>
                              <p className="font-bold text-slate-700 text-sm">New Branch Initialization</p>
                              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                No employees can be active inside a branch that hasn't been created yet. Save this form first.
                              </p>
                            </div>
                          ) : (
                            <>
                              {/* Search bar inside Tab 2 */}
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                  🔍
                                </span>
                                <input
                                  type="text"
                                  value={staffSearch}
                                  onChange={(e) => setStaffSearch(e.target.value)}
                                  placeholder="Search employees by name, email, or role..."
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                                />
                              </div>

                              {filteredMembers.length === 0 ? (
                                <div className="text-center py-12">
                                  <p className="text-xs text-slate-400 italic">
                                    {staffSearch ? "No members match this search query." : "No active members currently mapped in this branch."}
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                                  {filteredMembers.map((emp) => {
                                    const initials = emp.name ? emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
                                    return (
                                      <div 
                                        key={emp._id} 
                                        className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/60 rounded-2xl border border-slate-200/40 transition"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          {emp.avatar ? (
                                            <img src={emp.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0" />
                                          ) : (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                              {initials}
                                            </div>
                                          )}
                                          <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-800 truncate leading-tight">{emp.name}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                              <span className="px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 text-[8px] uppercase tracking-wide font-bold">{emp.department}</span>
                                              <span className="truncate capitalize font-medium">{emp?.role?.replace('-', ' ') || ""}</span>
                                            </p>
                                          </div>
                                        </div>
                                        
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setShowModal(false); // Close edit branch modal
                                            handleOpenTransferModal(emp); // Open transfer dialog
                                          }}
                                          className="bg-white border border-slate-200/80 hover:bg-blue-50 text-slate-500 hover:text-blue-600 font-semibold text-[10px] px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm"
                                        >
                                          <span>Transfer</span> 🔄
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Unified actions bottom bar */}
                <div className="flex gap-2.5 p-4 border-t border-slate-100 bg-slate-50/30 flex-shrink-0">
                  {/* Mobile navigation controls */}
                  <div className="flex w-full gap-2.5 lg:hidden">
                    {mobileStep === 1 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowModal(false)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition border border-slate-200/40"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!formData.name || !formData.code) {
                              showToast("Please fill in Branch Name and Branch Code", "error");
                              return;
                            }
                            setMobileStep(2);
                          }}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-blue-200"
                        >
                          Next ➔
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setMobileStep(1)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition border border-slate-200/40"
                        >
                          ➔ Back
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-blue-200"
                        >
                          {submitting
                            ? "Saving Changes..."
                            : editingBranch
                              ? "Update Branch"
                              : "Save Branch"}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Desktop navigation controls */}
                  <div className="hidden lg:flex w-full gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold py-2.5 rounded-xl text-xs transition border border-slate-200/40"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-blue-200"
                    >
                      {submitting
                        ? "Saving Changes..."
                        : editingBranch
                          ? "Update Branch Card"
                          : "Save Branch Card"}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transfer Employee Modal */}
      <AnimatePresence>
        {showTransferModal && transferEmployee && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div 
              className="fixed inset-0" 
              onClick={() => {
                setShowTransferModal(false);
                setTransferEmployee(null);
              }} 
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col z-50 border border-slate-100"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/30 to-indigo-50/30">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span>🔄</span> Transfer Employee
                  </h2>
                  <p className="text-xs text-slate-500">
                    Migrate employee tasks and branch scopes atomically.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferEmployee(null);
                  }}
                  className="h-8 w-8 grid place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition text-lg"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="px-6 py-5 space-y-6">
                {/* Employee card */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/50 flex items-center gap-3">
                  {transferEmployee.avatar ? (
                    <img
                      src={transferEmployee.avatar}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {transferEmployee.name
                        ? transferEmployee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase()
                        : "??"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-800 truncate leading-tight">
                      {transferEmployee.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 capitalize mt-0.5 font-medium">
                      {transferEmployee?.role?.replace("-", " ") || ""}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100/60 text-blue-700 border border-blue-200/30">
                        {transferEmployee.branch}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-600">
                        {transferEmployee.department}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target Branch */}
                <Field label="Target Destination Branch" required>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                      🏢
                    </span>
                    <select
                      value={transferForm.targetBranch}
                      onChange={(e) => {
                        const nextBranch = e.target.value;
                         const selectedBranchObj = (branches || []).find(
                           (b) => b.name === nextBranch
                         );
                        const allowedDepts = selectedBranchObj?.departments || [];
                        setTransferForm({
                          targetBranch: nextBranch,
                          targetDept: allowedDepts.includes(transferForm.targetDept)
                            ? transferForm.targetDept
                            : allowedDepts[0] || "",
                        });
                      }}
                      className={`${inputClass} pl-10 bg-slate-50 hover:bg-slate-100/50`}
                      required
                    >
                      <option value="" disabled>
                        Select target branch...
                      </option>
                      {(branches || []).map((b) => (
                        <option key={b._id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>

                {/* Target Department */}
                <Field label="Target Mapped Department" required>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                      📂
                    </span>
                    <select
                      value={transferForm.targetDept}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          targetDept: e.target.value,
                        })
                      }
                      className={`${inputClass} pl-10 bg-slate-50 hover:bg-slate-100/50`}
                      required
                      disabled={!transferForm.targetBranch}
                    >
                      <option value="" disabled>
                        Select target department...
                      </option>
                      {(
                        (branches || []).find((b) => b?.name === transferForm.targetBranch)
                          ?.departments || []
                      ).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>

                <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-3 text-[10px] text-amber-800 leading-relaxed flex gap-2.5 items-start">
                  <span className="text-base select-none mt-0.5">💡</span>
                  <div>
                    <strong>Task Migration Pipeline:</strong> Transferring this employee automatically re-routes all their active and historic task logs to match the new branch metadata, ensuring flawless KPI tracking and dashboard stability.
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTransferModal(false);
                      setTransferEmployee(null);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-semibold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={transferSubmitting}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-semibold text-xs transition shadow-lg shadow-blue-200"
                  >
                    {transferSubmitting ? "Syncing..." : "Confirm Transfer"}
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

const inputClass =
  "w-full px-3.5 h-11 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm placeholder-slate-400 text-sm";

const Field = ({ label, required, children }) => (
  <div className="flex flex-col gap-1.5 w-full flex-1">
    <label className="text-slate-550 font-semibold text-xs ml-1 block">
      {label} {required && <span className="text-red-500 font-bold">*</span>}
    </label>
    {children}
  </div>
);

export default BranchManagement;
