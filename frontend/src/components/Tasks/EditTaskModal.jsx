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
  FiClock,
  FiCheckCircle,
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

  const loadDbBranches = async () => {
    try {
      const response = await getBranches();
      if (response.data.success) setDbBranches(response.data.data);
    } catch (e) { console.error("Failed to load branches:", e); }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const role = user?.role;
      const branch = user?.branch;
      const department = user?.department;
      let r;
      if (role === "branch-head" && branch) r = await getUsersByBranch(branch);
      else if (role === "department-head" && department) r = await getUsersByDepartment(department, branch);
      else r = await getUsers({ limit: 1000 });
      if (r?.data?.success) {
        let list = r.data.data || [];
        if (role === "department-head" && branch) list = list.filter((u) => u.branch === branch);
        setUsers(list.filter((u) => u.role !== "admin"));
      }
    } catch (e) { console.error("Failed to load users:", e); }
    finally { setUsersLoading(false); }
  };

  // Populate form when task opens
  useEffect(() => {
    if (task && isOpen) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        branch: task.branch || branches[0] || "Gaurabagh",
        department: task.department || departments[0] || "IT",
        assignedTo: task.assignedTo?._id || "",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
        priority: task.priority || "medium",
      });
      setIsTeamTask(task.isTeamTask === true);
      setSelectedTeam(task.assignedTeam?.map((t) => t._id || t) || []);
      setCollaboratingDepts(task.collaboratingDepartments || []);
      setError("");
      loadUsers();
      loadDbBranches();
    }
  }, [task, isOpen]);

  // Strict cascade: filter by exact branch AND department
  useEffect(() => {
    setFilteredUsers(
      users.filter((u) => u.department === formData.department && u.branch === formData.branch)
    );
  }, [formData.branch, formData.department, users]);

  const role = user?.role;
  const branchLocked = role === "branch-head" || role === "department-head";
  const deptLocked = role === "department-head";

  const departmentsForSelectedBranch = useMemo(() => {
    const b = formData.branch;
    if (!b) return departments;
    const branchObj = dbBranches.find((br) => br.name === b);
    if (branchObj?.departments?.length > 0) return branchObj.departments;
    const set = new Set(users.filter((u) => u.branch === b).map((u) => u.department).filter(Boolean));
    const allowed = departments.filter((d) => set.has(d));
    return allowed.length > 0 ? allowed : departments;
  }, [formData.branch, dbBranches, departments, users]);

  const handleBranchChange = useCallback((nextBranch) => {
    if (!nextBranch) return;
    const branchObj = dbBranches.find((br) => br.name === nextBranch);
    const branchDepts = branchObj?.departments?.length > 0 ? branchObj.departments : departments;
    setFormData((prev) => ({ ...prev, branch: nextBranch, department: branchDepts[0] || "IT", assignedTo: "" }));
    setSelectedTeam([]);
  }, [dbBranches, departments]);

  const handleDeptChange = useCallback((nextDept) => {
    setFormData((prev) => ({ ...prev, department: nextDept, assignedTo: "" }));
    setSelectedTeam([]);
  }, []);

  const handleAssigneeChange = useCallback((nextId) => {
    setFormData((prev) => ({ ...prev, assignedTo: nextId }));
  }, []);

  const branchOptions = useMemo(() => branches.map((b) => ({ value: b, label: b })), [branches]);
  const deptOptions = useMemo(() => departmentsForSelectedBranch.map((d) => ({ value: d, label: d })), [departmentsForSelectedBranch]);
  // Assignee options: Name (EmployeeID)
  const assigneeOptions = useMemo(() => filteredUsers.map((u) => ({
    value: u._id,
    label: `${u.name} (${u.employeeId || u._id})`,
    subLabel: u.role,
  })), [filteredUsers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return setError("Task title is required.");
    if (!isTeamTask && !formData.assignedTo) return setError("Please select an employee to assign this task to.");
    if (isTeamTask && selectedTeam.length === 0) return setError("Please select at least one team member.");
    if (!formData.dueDate) return setError("Due date is required.");
    setLoading(true);
    setError("");
    const taskData = isTeamTask
      ? { title: formData.title, description: formData.description, department: formData.department, branch: formData.branch, dueDate: formData.dueDate, priority: formData.priority, isTeamTask: true, assignedTeam: selectedTeam, collaboratingDepartments: collaboratingDepts }
      : { title: formData.title, description: formData.description, department: formData.department, branch: formData.branch, assignedTo: formData.assignedTo, dueDate: formData.dueDate, priority: formData.priority, isTeamTask: false };
    try {
      await updateTask(task._id, taskData);
      toast.success("Task updated successfully!");
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center p-4 overflow-y-auto antialiased">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 flex flex-col max-h-[92vh]"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-800">✏️ Edit Task</h2>
                <p className="text-xs text-slate-500 mt-0.5">Update the task details below</p>
              </div>
              <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition">
                <FiX size={16} />
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 border-b border-red-100 text-red-700 px-6 py-2.5 text-xs font-semibold flex items-center gap-2 flex-shrink-0">
                <FiAlertTriangle size={13} className="flex-shrink-0" /><span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

                {/* Task Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Task Title <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder-slate-400"
                    placeholder="What needs to be done?" />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder-slate-400 resize-none"
                    rows="3" placeholder="Describe the task and any important details..." />
                </div>

                {/* Due Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Due Date <span className="text-red-500">*</span></label>
                  <input type="date" required value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer" />
                </div>

                {/* Priority */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer">
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🟠 High</option>
                    <option value="urgent">🔴 Urgent</option>
                  </select>
                </div>

                {/* Branch */}
                <SearchableCombobox label="Branch" options={branchOptions} value={formData.branch} onChange={handleBranchChange} disabled={branchLocked} placeholder="Select branch..." isClearable={false} />

                {/* Department */}
                <SearchableCombobox label="Department" options={deptOptions} value={formData.department} onChange={handleDeptChange} disabled={deptLocked} placeholder="Select department..." isClearable={false} />

                {/* Team Task Toggle */}
                <label className="flex items-center justify-between gap-3 cursor-pointer bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl px-4 py-3 transition select-none">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Team Task</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Assign to multiple people at once</p>
                  </div>
                  <input type="checkbox" checked={isTeamTask} onChange={(e) => { setIsTeamTask(e.target.checked); if (e.target.checked) setFormData(prev => ({ ...prev, assignedTo: "" })); else setSelectedTeam([]); }}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20" />
                </label>

                {/* Assignee — strict branch+dept filtering */}
                {!isTeamTask ? (
                  <div className="flex flex-col gap-1.5">
                    <SearchableCombobox
                      label="Assign To *"
                      options={assigneeOptions}
                      value={formData.assignedTo}
                      onChange={handleAssigneeChange}
                      placeholder={usersLoading ? "Loading employees..." : filteredUsers.length === 0 ? "No employees in this branch/department" : "Select employee..."}
                      isClearable={true}
                    />
                    <p className="text-[10px] text-slate-400 px-1">
                      {usersLoading ? "Loading..." : `${filteredUsers.length} employee${filteredUsers.length !== 1 ? "s" : ""} in ${formData.branch} — ${formData.department}`}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600">Select Team Members <span className="text-red-500">*</span></label>
                    {usersLoading ? (
                      <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">Loading employees...</div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="py-5 text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
                        No employees found in {formData.branch} — {formData.department}
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl bg-slate-50 p-2 space-y-1 max-h-[160px] overflow-y-auto">
                        {filteredUsers.map((u) => {
                          const isChecked = selectedTeam.includes(u._id);
                          return (
                            <label key={u._id} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none text-xs ${isChecked ? "bg-blue-50 border border-blue-200 text-blue-700" : "hover:bg-slate-100 text-slate-700"}`}>
                              <span className="font-medium">{u.name} ({u.employeeId || u._id})</span>
                              <input type="checkbox" checked={isChecked}
                                onChange={() => setSelectedTeam((prev) => prev.includes(u._id) ? prev.filter((id) => id !== u._id) : [...prev, u._id])}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20" />
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {selectedTeam.length > 0 && <p className="text-[10px] text-emerald-600 font-semibold px-1">✓ {selectedTeam.length} member{selectedTeam.length !== 1 ? "s" : ""} selected</p>}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition disabled:opacity-50 text-sm flex items-center justify-center gap-1.5">
                  {loading ? <><FiClock className="animate-spin" /> Saving...</> : <><FiCheckCircle /> Save Changes</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditTaskModal;
