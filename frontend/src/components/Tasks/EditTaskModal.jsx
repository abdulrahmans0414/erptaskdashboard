import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  updateTask,
  getUsers,
  getBranches,
  getUsersByBranch,
  getUsersByDepartment,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import {
  FiX,
  FiAlertTriangle,
  FiCalendar,
  FiClock,
  FiUsers,
  FiBriefcase,
  FiMapPin,
  FiCheckCircle,
  FiList
} from "react-icons/fi";
import SearchableCombobox from "../Common/SearchableCombobox";
import toast from "react-hot-toast";

const EditTaskModal = ({ isOpen, onClose, task, onUpdated }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const branches = useMemo(() => settings?.branches || ["Gaurabagh"], [settings]);
  const departments = useMemo(() => settings?.departments || ["IT"], [settings]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    branch: "",
    department: "",
    assignedTo: "",
    dueDate: "",
    priority: "medium",
    estimatedHours: "",
    estimatedMinutes: "",
  });

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTeamTask, setIsTeamTask] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState([]);
  const [collaboratingDepts, setCollaboratingDepts] = useState([]);
  const [dbBranches, setDbBranches] = useState([]);
  const [activeTab, setActiveTab] = useState("assignment");

  // Load branches
  const loadDbBranches = async () => {
    try {
      const response = await getBranches();
      if (response.data.success) {
        setDbBranches(response.data.data);
      }
    } catch (e) {
      console.error("Failed to load branches:", e);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const role = user?.role;
      const branch = user?.branch;
      const department = user?.department;

      let r;
      if (role === "branch-head" && branch) r = await getUsersByBranch(branch);
      else if (role === "department-head" && department)
        r = await getUsersByDepartment(department, branch);
      else r = await getUsers({ limit: 1000 });

      if (r?.data?.success) {
        let list = r.data.data || [];
        if (role === "department-head" && branch) {
          list = list.filter((u) => u.branch === branch);
        }
        setUsers(list.filter((u) => u.role !== "admin"));
      }
    } catch (e) {
      console.error("Failed to load users for task editing:", e);
    } finally {
      setUsersLoading(false);
    }
  };

  // Populate data when task opens
  useEffect(() => {
    if (task && isOpen) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        branch: task.branch || branches[0] || "Gaurabagh",
        department: task.department || departments[0] || "IT",
        assignedTo: task.assignedTo?._id || "",
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().split("T")[0]
          : "",
        priority: task.priority || "medium",
        estimatedHours: task.estimatedHours || "",
        estimatedMinutes: task.estimatedMinutes || "",
      });
      setIsTeamTask(task.isTeamTask === true);
      setSelectedTeam(task.assignedTeam?.map(t => t._id || t) || []);
      setCollaboratingDepts(task.collaboratingDepartments || []);
      setError("");
      setActiveTab("assignment");
      loadUsers();
      loadDbBranches();
    }
  }, [task, isOpen]);

  // Filter users by branch and department selection
  useEffect(() => {
    setFilteredUsers(
      users.filter(
        (u) =>
          u.department === formData.department && u.branch === formData.branch
      )
    );
  }, [formData.branch, formData.department, users]);

  const role = user?.role;
  const branchLocked = role === "branch-head" || role === "department-head";
  const deptLocked = role === "department-head";

  const departmentsForSelectedBranch = useMemo(() => {
    const b = formData.branch;
    if (!b) return departments;

    const branchObj = dbBranches.find((br) => br.name === b);
    if (branchObj && branchObj.departments && branchObj.departments.length > 0) {
      return branchObj.departments;
    }

    const set = new Set(
      users
        .filter((u) => u.branch === b)
        .map((u) => u.department)
        .filter(Boolean)
    );
    const allowed = departments.filter((d) => set.has(d));
    return allowed.length > 0 ? allowed : departments;
  }, [formData.branch, dbBranches, departments, users]);

  const handleBranchChange = useCallback((nextBranch) => {
    if (!nextBranch) return;
    const branchObj = dbBranches.find((br) => br.name === nextBranch);
    const branchDepts = (branchObj && branchObj.departments && branchObj.departments.length > 0)
      ? branchObj.departments
      : departments;
    
    setFormData((prev) => ({
      ...prev,
      branch: nextBranch,
      department: branchDepts[0] || "IT",
      assignedTo: "",
    }));
    setSelectedTeam([]);
  }, [dbBranches, departments]);

  const handleDeptChange = useCallback((nextDept) => {
    setFormData((prev) => ({
      ...prev,
      department: nextDept,
      assignedTo: "",
    }));
    setSelectedTeam([]);
  }, []);

  const handleAssigneeChange = useCallback((nextAssigneeId) => {
    setFormData((prev) => ({
      ...prev,
      assignedTo: nextAssigneeId,
    }));
  }, []);

  // Options memoization for Combobox
  const branchOptions = useMemo(() => {
    return branches.map((b) => ({ value: b, label: b, subLabel: "Corporate Branch Office" }));
  }, [branches]);

  const deptOptions = useMemo(() => {
    return departmentsForSelectedBranch.map((d) => ({ value: d, label: d, subLabel: "Company Division" }));
  }, [departmentsForSelectedBranch]);

  const assigneeOptions = useMemo(() => {
    return filteredUsers.map((u) => ({
      value: u._id,
      label: u.name,
      subLabel: `ID: ${u.employeeId || "—"} | ${u.role}`,
    }));
  }, [filteredUsers]);

  const handleCollaboratingDeptToggle = useCallback((dept) => {
    setCollaboratingDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return setError("Task Title is required");
    if (!isTeamTask && !formData.assignedTo) return setError("Assignee selection is required");
    if (isTeamTask && selectedTeam.length === 0)
      return setError("At least one Team Member must be selected");
    if (!formData.dueDate) return setError("Due date specification is required");

    setLoading(true);
    setError("");
    const eh = parseFloat(formData.estimatedHours) || 0;
    const em = parseFloat(formData.estimatedMinutes) || 0;

    const taskData = isTeamTask
      ? {
          title: formData.title,
          description: formData.description,
          department: formData.department,
          branch: formData.branch,
          dueDate: formData.dueDate,
          priority: formData.priority,
          estimatedHours: Math.max(0, eh),
          estimatedMinutes: Math.max(0, em),
          isTeamTask: true,
          assignedTeam: selectedTeam,
          collaboratingDepartments: collaboratingDepts,
        }
      : {
          title: formData.title,
          description: formData.description,
          department: formData.department,
          branch: formData.branch,
          assignedTo: formData.assignedTo,
          dueDate: formData.dueDate,
          priority: formData.priority,
          estimatedHours: Math.max(0, eh),
          estimatedMinutes: Math.max(0, em),
          isTeamTask: false,
        };

    try {
      await updateTask(task._id, taskData);
      
      setLoading(false);
      toast.success("✅ Task updated successfully!");
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update task";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[99] overflow-y-auto antialiased subpixel-antialiased">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 20 }}
          className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        >
          {/* Header Bar */}
          <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-150 sticky top-0 bg-white z-20">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                ✏️ Update Task Specifications
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Modify parameters or reassign active workload</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-850 flex items-center justify-center transition"
            >
              <FiX size={16} />
            </button>
          </div>

          {/* Alert Notification Banner */}
          {error && (
            <div className="bg-red-50 border-b border-red-100 text-red-650 px-6 py-3 text-xs font-semibold flex items-center gap-2">
              <FiAlertTriangle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Split Pane body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto md:grid md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              
              {/* Left Pane: Core Task Parameters */}
              <div className="p-6 space-y-4 md:col-span-7">
                <h3 className="text-sm font-bold text-blue-600 flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span>01.</span> Task Specifications & Parameters
                </h3>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-350 transition-all placeholder-slate-400"
                    placeholder="Provide a concise title for the deliverable..."
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">
                    Detailed Scope Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-350 transition-all placeholder-slate-400"
                    rows="3.5"
                    placeholder="Explain expectations, metrics for success, and contextual guidelines..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">
                      Due Date Specification <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-350 transition-all cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">
                      Workflow Priority Level
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-850 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-350 transition cursor-pointer"
                    >
                      <option value="low" className="bg-white text-slate-850">🟢 Low Priority</option>
                      <option value="medium" className="bg-white text-slate-850">🟡 Medium Priority</option>
                      <option value="high" className="bg-white text-slate-850">🟠 High Priority</option>
                      <option value="urgent" className="bg-white text-slate-850">🔴 Urgent Backlog</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">
                      Estimated Hours Estimate
                    </label>
                    <div className="relative">
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">HRS</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.estimatedHours}
                        onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-2.5 text-sm text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-350 transition placeholder-slate-400"
                        placeholder="e.g. 12"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">
                      Estimated Minutes Buffer
                    </label>
                    <div className="relative">
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">MIN</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={formData.estimatedMinutes}
                        onChange={(e) => setFormData({ ...formData, estimatedMinutes: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-2.5 text-sm text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-slate-350 transition placeholder-slate-400"
                        placeholder="e.g. 30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Pane: Tabs for Scope & Assignment */}
              <div className="p-6 md:col-span-5 flex flex-col space-y-4">
                
                {/* Framer Motion Tab Headers */}
                <div className="flex border border-slate-200 p-0.5 bg-slate-50 rounded-xl relative">
                  {[
                    { id: "assignment", label: "Assignment", icon: <FiUsers /> },
                    { id: "scope", label: "Scope & Assets", icon: <FiList /> }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all relative z-10 ${activeTab === t.id ? "text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {t.icon} {t.label}
                      {activeTab === t.id && (
                        <motion.div
                          layoutId="editTaskTabOutline"
                          className="absolute inset-0 bg-white border border-slate-200 rounded-lg -z-10 shadow-sm"
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-hidden flex flex-col justify-start">
                  
                  {/* TAB 1: Assignment Panel */}
                  {activeTab === "assignment" && (
                    <motion.div
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <h3 className="text-sm font-bold text-blue-600 flex items-center gap-2 border-b border-slate-200 pb-2">
                        <span>02.</span> Corporate Routing Matrix
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SearchableCombobox
                          label="Office Branch Scope"
                          options={branchOptions}
                          value={formData.branch}
                          onChange={handleBranchChange}
                          disabled={branchLocked}
                          placeholder="Select office branch..."
                          isClearable={false}
                        />

                        <SearchableCombobox
                          label="Target Department"
                          options={deptOptions}
                          value={formData.department}
                          onChange={handleDeptChange}
                          disabled={deptLocked}
                          placeholder="Select department..."
                          isClearable={false}
                        />
                      </div>

                      {/* Team Assignment Toggle */}
                      <label className="flex items-start justify-between gap-3 cursor-pointer bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-2xl px-4 py-3 transition-all select-none">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                            <FiUsers /> Establish Team Task
                          </p>
                          <p className="text-[11px] text-slate-500 leading-tight">Distribute workload to multiple team members concurrently</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isTeamTask}
                          onChange={(e) => {
                            setIsTeamTask(e.target.checked);
                            if (e.target.checked) setFormData(prev => ({ ...prev, assignedTo: "" }));
                            else setSelectedTeam([]);
                          }}
                          className="w-5 h-5 rounded-lg border-slate-300 bg-white text-blue-650 focus:ring-blue-500/20"
                        />
                      </label>

                      {/* Dynamic Target Operator selection */}
                      {!isTeamTask ? (
                        <div className="space-y-2 border-t border-slate-200 pt-3">
                          <SearchableCombobox
                            label="Target Individual Operator"
                            options={assigneeOptions}
                            value={formData.assignedTo}
                            onChange={handleAssigneeChange}
                            placeholder={usersLoading ? "Querying database..." : "Search corporate personnel..."}
                            isClearable={true}
                          />
                          <p className="text-[10px] text-slate-500 font-semibold px-1">
                            📍 {formData.branch} | 🏢 {formData.department} | {usersLoading ? "Loading..." : `${filteredUsers.length} active employees match scope`}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 border-t border-slate-200 pt-3">
                          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">
                            Select Team Operators <span className="text-red-500">*</span>
                          </label>
                          <p className="text-[10px] text-slate-500 font-semibold mb-1.5">
                            Check multiple targets within branch/department:
                          </p>

                          {usersLoading ? (
                            <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5">
                              <FiRefreshCw className="animate-spin text-blue-600" /> Loading employees...
                            </div>
                          ) : filteredUsers.length === 0 ? (
                            <div className="py-6 text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
                              ⚠️ No active personnel allocated in this scope division.
                            </div>
                          ) : (
                            <div className="max-h-[160px] overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl bg-slate-50 p-2 space-y-1.5">
                              {filteredUsers.map((u) => {
                                const isChecked = selectedTeam.includes(u._id);
                                return (
                                  <label
                                    key={u._id}
                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none text-xs ${isChecked ? "bg-blue-50 border border-blue-100 text-blue-700" : "bg-transparent border border-transparent text-slate-600 hover:bg-slate-100"}`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-800">{u.name}</span>
                                      <span className="text-[10px] text-slate-500 font-semibold mt-0.5">ID: {u.employeeId || "—"} • {u.role}</span>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        setSelectedTeam((prev) =>
                                          prev.includes(u._id)
                                            ? prev.filter((id) => id !== u._id)
                                            : [...prev, u._id]
                                        )
                                      }
                                      className="w-4.5 h-4.5 rounded border-slate-300 bg-white text-blue-650 focus:ring-blue-500/20"
                                    />
                                  </label>
                                );
                              })}
                            </div>
                          )}
                          
                          {selectedTeam.length > 0 && (
                            <p className="text-[10px] text-emerald-600 font-bold px-1">
                              ✓ {selectedTeam.length} operators assigned to team execution
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* TAB 2: Scope & Assets Panel */}
                  {activeTab === "scope" && (
                    <motion.div
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <h3 className="text-sm font-bold text-blue-600 flex items-center gap-2 border-b border-slate-200 pb-2">
                        <span>03.</span> Cross-Department Collaboration
                      </h3>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">
                          Collaborating Departments
                        </label>
                        <p className="text-[10px] text-slate-500 font-semibold">
                          Grant other division divisions visibility or joint execution parameters:
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl bg-slate-50 p-2.5">
                          {departments.map((dept) => {
                            if (dept === formData.department) return null; // Avoid self-collaborating
                            const isChecked = collaboratingDepts.includes(dept);
                            return (
                              <label
                                key={dept}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition select-none text-xs border ${isChecked ? "bg-blue-50 border border-blue-100 text-blue-700" : "bg-transparent border border-transparent text-slate-600 hover:bg-slate-100"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleCollaboratingDeptToggle(dept)}
                                  className="w-4 h-4 rounded border-slate-300 bg-white text-blue-650 focus:ring-blue-500/20"
                                />
                                <span>{dept}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Controls footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 mt-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/10 transition active:scale-98 disabled:opacity-50 text-sm flex items-center justify-center gap-1.5"
              >
                {loading ? "Updating..." : "Update Task Specifications"}
              </button>
            </div>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default EditTaskModal;
