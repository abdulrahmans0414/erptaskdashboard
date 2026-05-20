import { useState, useEffect } from "react";
import { reassignTask, getUsers } from "../../services/api";
import toast from "react-hot-toast";

const ReassignTaskModal = ({ isOpen, onClose, task, onUpdated }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    if (isOpen && task) loadUsers();
  }, [isOpen, task]);

  const loadUsers = async () => {
    try {
      const r = await getUsers({ limit: 1000 });
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
      await reassignTask(task._id, {
        assignedTo: selectedUser,
        reason: reason || "Task reassigned",
      });
      
      setLoading(false);
      toast.success("✅ Task reassigned successfully!", {
        duration: 4000,
        style: { fontWeight: "600" }
      });
      
      if (onUpdated) onUpdated();
      onClose();
      
      // Wipe internal state
      setSelectedUser("");
      setSearch("");
      setReason("");
      
      return;
    } catch (e) {
      const msg = e.response?.data?.message || "Failed to reassign";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
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
            <div className="relative">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search by name or employee ID..."
                  className="w-full pl-8 pr-10 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                  value={search}
                  onFocus={() => setShowUsers(true)}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowUsers(true);
                    if (selectedUser) setSelectedUser("");
                  }}
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
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y bg-white shadow-xl origin-top">
                  {users
                    .filter(u => 
                      !search || 
                      u.name.toLowerCase().includes(search.toLowerCase()) ||
                      u.employeeId?.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((u) => (
                      <div 
                        key={u._id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedUser(u._id);
                          setSearch(u.name);
                          setShowUsers(false);
                        }}
                        className={`p-3 text-sm cursor-pointer transition-colors flex items-center justify-between group ${
                          selectedUser === u._id 
                            ? "bg-blue-50 ring-1 ring-inset ring-blue-200" 
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className={`font-medium ${selectedUser === u._id ? "text-blue-700" : "text-gray-700"}`}>
                            {u.name}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            ID: {u.employeeId || "N/A"} • {u.role}
                          </span>
                        </div>
                        {selectedUser === u._id && (
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
