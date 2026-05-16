import { useState, useEffect } from "react";
import {
  createTask,
  getUsers,
  getUsersByBranch,
  getUsersByDepartment,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import toast from "react-hot-toast";

const CreateTaskModal = ({ isOpen, onClose, onTaskCreated }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const branches = settings?.branches || ["Gaurabagh"];
  const departments = settings?.departments || ["IT"];

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    branch: branches[0] || "Gaurabagh",
    department: departments[0] || "IT",
    assignedTo: "",
    dueDate: "",
    priority: "medium",
    estimatedHours: "",
    estimatedMinutes: "",
  });

  const [userSearch, setUserSearch] = useState("");

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTeamTask, setIsTeamTask] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState([]);
  const [collaboratingDepts, setCollaboratingDepts] = useState([]);
  const [taskFormFiles, setTaskFormFiles] = useState([]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      loadUsers();
    }
  }, [isOpen, user?.role, user?.branch, user?.department]);

  const loadUsers = async () => {
    try {
      const role = user?.role;
      const branch = user?.branch;
      const department = user?.department;

      let r;
      if (role === "branch-head" && branch) r = await getUsersByBranch(branch);
      else if (role === "department-head" && department)
        r = await getUsersByDepartment(department);
      else r = await getUsers(); // admin/it/hr

      if (r?.data?.success) {
        let list = r.data.data || [];

        // Department endpoint is not branch-scoped in backend, so enforce it here.
        if (role === "department-head" && branch) {
          list = list.filter((u) => u.branch === branch);
        }

        setUsers(list.filter((u) => u.role !== "admin"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setFilteredUsers(
      users.filter(
        (u) =>
          u.department === formData.department && u.branch === formData.branch,
      ),
    );
  }, [formData.branch, formData.department, users]);

  const resetForm = () => {
    const role = user?.role;
    const branch = user?.branch || branches[0] || "Gaurabagh";
    const department = user?.department || departments[0] || "IT";

    const lockedBranch =
      role === "branch-head" || role === "department-head" ? branch : (branches[0] || "Gaurabagh");
    const lockedDept =
      role === "department-head"
        ? department
        : role === "hr"
          ? "HR"
          : (departments[0] || "IT");

    setFormData({
      title: "",
      description: "",
      department: lockedDept,
      branch: lockedBranch,
      assignedTo: "",
      dueDate: "",
      priority: "medium",
      estimatedHours: "",
      estimatedMinutes: "",
    });
    setUserSearch("");
    setIsTeamTask(false);
    setSelectedTeam([]);
    setCollaboratingDepts([]);
    setTaskFormFiles([]);
    setError("");
  };

  const role = user?.role;
  const branchLocked = role === "branch-head" || role === "department-head";
  const deptLocked = role === "department-head";

  const departmentsForSelectedBranch = (() => {
    const b = formData.branch;
    if (!b) return departments;
    const set = new Set(
      users
        .filter((u) => u.branch === b)
        .map((u) => u.department)
        .filter(Boolean),
    );
    const allowed = departments.filter((d) => set.has(d));
    return allowed.length > 0 ? allowed : departments;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return setError("Title required");
    if (!isTeamTask && !formData.assignedTo) return setError("Select employee");
    if (isTeamTask && selectedTeam.length === 0)
      return setError("Select team members");
    if (!formData.dueDate) return setError("Due date required");

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
      if (taskFormFiles.length > 0) {
        const fd = new FormData();
        Object.entries(taskData).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
          else fd.append(k, String(v));
        });
        taskFormFiles.forEach((f) => fd.append("taskFormFiles", f));
        await createTask(fd);
      } else {
        await createTask(taskData);
      }
      toast.success("Task created successfully!");
      if (onTaskCreated) onTaskCreated();
      onClose();
      resetForm();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create task";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b px-5 py-4 rounded-t-xl flex justify-between z-10">
          <div>
            <h2 className="text-lg font-bold">📋 Assign New Task</h2>
            <p className="text-xs text-gray-500">Fill details to create task</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Enter task title"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows="2"
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                📎 Attach Form / Document (optional)
              </label>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xlsx,.zip"
                onChange={(e) => setTaskFormFiles(Array.from(e.target.files || []))}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
              />
              {taskFormFiles.length > 0 && (
                <p className="text-[10px] text-gray-500 mt-1">
                  ✓ {taskFormFiles.length} file(s) selected
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  📍 Branch *
                </label>
                <select
                  value={formData.branch}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      branch: e.target.value,
                      assignedTo: "",
                    })
                  }
                  disabled={branchLocked}
                  className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  🏢 Dept *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      department: e.target.value,
                      assignedTo: "",
                    })
                  }
                  disabled={deptLocked}
                  className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {departmentsForSelectedBranch.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Team Task Toggle */}
            <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={isTeamTask}
                onChange={(e) => {
                  setIsTeamTask(e.target.checked);
                  if (e.target.checked)
                    setFormData({ ...formData, assignedTo: "" });
                  else setSelectedTeam([]);
                }}
                className="w-4 h-4"
              />
              <span className="text-xs font-medium">👥 Team Task</span>
            </label>

            {/* Employee Selection */}
            {isTeamTask ? (
              <div>
                <label className="block text-xs font-medium mb-1">
                  Team Members *
                </label>
                <p className="text-[10px] text-gray-400 mb-1">
                  📍{formData.branch} | 🏢{formData.department} |{" "}
                  {filteredUsers.length} available
                </p>
                <select
                  multiple
                  value={selectedTeam}
                  onChange={(e) =>
                    setSelectedTeam(
                      Array.from(e.target.selectedOptions, (o) => o.value),
                    )
                  }
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  size="4"
                >
                  {filteredUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
                {selectedTeam.length > 0 && (
                  <p className="text-[10px] text-green-600 mt-1">
                    ✓ {selectedTeam.length} selected
                  </p>
                )}
                {filteredUsers.length === 0 && (
                  <p className="text-[10px] text-yellow-600 mt-1">
                    ⚠️ No employees in this dept/branch
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium mb-1">
                  Assign To *
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        if (formData.assignedTo) setFormData(p => ({ ...p, assignedTo: "" }));
                      }}
                      placeholder="Search by name or employee ID..."
                      className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                    />
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y bg-white shadow-inner">
                    {filteredUsers
                      .filter(u => 
                        !userSearch || 
                        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.employeeId?.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map((u) => (
                        <div 
                          key={u._id}
                          onClick={() => {
                            setFormData({ ...formData, assignedTo: u._id });
                            setUserSearch(u.name);
                          }}
                          className={`p-3 text-sm cursor-pointer transition-colors flex items-center justify-between group ${
                            formData.assignedTo === u._id 
                              ? "bg-blue-50 ring-1 ring-inset ring-blue-200" 
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className={`font-medium ${formData.assignedTo === u._id ? "text-blue-700" : "text-gray-700"}`}>
                              {u.name}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              ID: {u.employeeId || "N/A"} • {u.role}
                            </span>
                          </div>
                          {formData.assignedTo === u._id && (
                            <span className="text-blue-600 text-xs">✓ Selected</span>
                          )}
                        </div>
                      ))}
                    {filteredUsers.length === 0 && (
                      <div className="p-4 text-center text-gray-400 text-xs italic">
                        No employees found in this department.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Est. Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimatedHours}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedHours: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Hours"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Est. Minutes
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={formData.estimatedMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimatedMinutes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Mins"
                />
              </div>
            </div>

            <div className="bg-blue-50 p-2 rounded-lg text-[10px] text-blue-700">
              ℹ️ Reviewed by Department Manager before approval.
            </div>

            <div className="flex gap-3 pt-2 border-t">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "📋 Assign Task"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  resetForm();
                }}
                className="flex-1 bg-gray-100 py-2.5 rounded-lg text-sm hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskModal;
