import { useState, useEffect } from "react";
import { updateTask, getUsers } from "../../services/api";
import toast from "react-hot-toast";

const EditTaskModal = ({ isOpen, onClose, task, onUpdated }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    department: "",
    assignedTo: "",
    dueDate: "",
    priority: "medium",
    estimatedHours: "",
    estimatedMinutes: "",
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        department: task.department || "IT",
        assignedTo: task.assignedTo?._id || "",
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().split("T")[0]
          : "",
        priority: task.priority || "medium",
        estimatedHours: task.estimatedHours || "",
        estimatedMinutes: task.estimatedMinutes || "",
      });
      setUserSearch(task.assignedTo?.name || "");
      loadUsers();
    }
  }, [task, isOpen]);

  const loadUsers = async () => {
    try {
      const response = await getUsers({ limit: 1000 });
      if (response.data.success) setUsers(response.data.data);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await updateTask(task._id, formData);
      setLoading(false);
      
      toast.success("✅ Task updated successfully!", {
        duration: 4000,
        style: { fontWeight: "600" }
      });
      
      if (onUpdated) onUpdated();
      onClose();
      
      // Wipe internal state completely
      setFormData({
        title: "", description: "", department: "",
        assignedTo: "", dueDate: "", priority: "medium",
        estimatedHours: "", estimatedMinutes: "",
      });
      setUserSearch("");
      
      return;
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error(error.response?.data?.message || "Failed to update task");
      setError(error.response?.data?.message || "Failed to update task");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const departments = [
    "IT",
    "HR",
    "Graphic",
    "Academic",
    "Finance",
    "Marketing",
    "Legal",
    "Transport",
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">✏️ Edit Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Department *
            </label>
            <select
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Assign To *</label>
            <div className="relative">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                <input
                  type="text"
                  value={userSearch}
                  onFocus={() => setShowUsers(true)}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setShowUsers(true);
                    if (formData.assignedTo) setFormData((p) => ({ ...p, assignedTo: "" }));
                  }}
                  placeholder="Search by name or employee ID..."
                  className="w-full pl-8 pr-10 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                />
                <button 
                  type="button"
                  onClick={() => setShowUsers(!showUsers)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showUsers ? "▴" : "▾"}
                </button>
              </div>

              {showUsers && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y bg-white shadow-xl animate-scaleIn origin-top">
                  {users
                    .filter(
                      (u) =>
                        !userSearch ||
                        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.employeeId?.toLowerCase().includes(userSearch.toLowerCase()),
                    )
                    .map((u) => (
                      <div
                        key={u._id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFormData({ ...formData, assignedTo: u._id });
                          setUserSearch(u.name);
                          setShowUsers(false);
                        }}
                        className={`p-3 text-sm cursor-pointer transition-colors flex items-center justify-between group ${
                          formData.assignedTo === u._id
                            ? "bg-blue-50 ring-1 ring-inset ring-blue-200"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span
                            className={`font-medium ${
                              formData.assignedTo === u._id
                                ? "text-blue-700"
                                : "text-gray-700"
                            }`}
                          >
                            {u.name}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            ID: {u.employeeId || "N/A"} • {u.role}
                          </span>
                        </div>
                        {formData.assignedTo === u._id && (
                          <span className="text-blue-600 text-xs">✓</span>
                        )}
                      </div>
                    ))}
                  {users.length === 0 && (
                    <div className="p-4 text-center text-gray-400 text-xs italic">
                      No employees found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Due Date *</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
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
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Est. Minutes
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={formData.estimatedMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, estimatedMinutes: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg"
            >
              {loading ? "Updating..." : "Update Task"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;
