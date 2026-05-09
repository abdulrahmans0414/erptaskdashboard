import { useState, useEffect } from "react";
import { updateTask, getUsers } from "../../services/api";

const ReassignTaskModal = ({ isOpen, onClose, task, onUpdated }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen && task) loadUsers();
  }, [isOpen, task]);

  const loadUsers = async () => {
    try {
      const r = await getUsers();
      if (r.data.success)
        setUsers(
          r.data.data.filter(
            (u) =>
              u.role !== "admin" &&
              u.department === task?.department &&
              u.branch === task?.branch,
          ),
        );
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return setError("Select employee");
    setLoading(true);
    setError("");
    try {
      await updateTask(task._id, {
        assignedTo: selectedUser,
        status: "pending",
        adminComments: reason || "Task reassigned",
      });
      if (onUpdated) onUpdated();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Failed");
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-2xl">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold">🔄 Reassign Task</h3>
          <button onClick={onClose} className="text-gray-400 text-xl">
            ×
          </button>
        </div>
        {error && (
          <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm font-medium">{task?.title}</p>
            <p className="text-xs text-gray-500">
              {task?.department} • {task?.branch}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              New Assignee *
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Select</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows="2"
              placeholder="Why reassigning?"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-600 text-white py-2 rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? "..." : "🔄 Reassign"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReassignTaskModal;
