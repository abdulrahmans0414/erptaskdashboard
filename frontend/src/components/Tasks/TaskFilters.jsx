import { useState, useEffect } from "react";
import { getUsers } from "../../services/api";

const TaskFilters = ({ filters, setFilters, onRefresh }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const r = await getUsers();
      if (r.data.success)
        setEmployees(r.data.data.filter((e) => e.role !== "admin"));
    } catch (e) {
      console.error(e);
    }
  };

  const statusOptions = [
    { value: "all", label: "All", icon: "📋" },
    { value: "pending", label: "Pending", icon: "⏳" },
    { value: "in-progress", label: "In Progress", icon: "🔄" },
    { value: "submitted", label: "Submitted", icon: "📤" },
    { value: "approved", label: "Approved", icon: "✅" },
    { value: "rejected", label: "Rejected", icon: "❌" },
    { value: "completed", label: "Completed", icon: "✔️" },
  ];

  const departmentOptions = [
    { value: "all", label: "All Departments" },
    ...[
      "IT",
      "HR",
      "Graphic",
      "Academic",
      "Finance",
      "Marketing",
      "Legal",
      "Transport",
      "Operations",
    ].map((d) => ({ value: d, label: d })),
  ];

  const branchOptions = [
    { value: "all", label: "All Branches" },
    ...[
      "Gaurabagh",
      "Vikas Nagar",
      "Kalyanpur",
      "Kursi",
      "Hive",
      "Ring Road",
      "Muazzam Nagar",
      "Aziz Nagar",
    ].map((b) => ({ value: b, label: b })),
  ];

  const handleFilterChange = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));
  const clearFilters = () =>
    setFilters({
      search: "",
      status: "all",
      department: "all",
      branch: "all",
      priority: "all",
      employee: "all",
    });

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.department !== "all" ||
    filters.branch !== "all" ||
    filters.priority !== "all" ||
    filters.search ||
    filters.employee !== "all";

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
      {/* Search + Actions */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px] relative">
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          ⚙️ Filters
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
          >
            ✕ Clear
          </button>
        )}
        <button
          onClick={onRefresh}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Status Chips */}
      <div className="flex flex-wrap gap-1.5">
        {statusOptions.map((o) => (
          <button
            key={o.value}
            onClick={() => handleFilterChange("status", o.value)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
              filters.status === o.value
                ? "bg-blue-600 text-white"
                : o.value === "approved"
                  ? "bg-green-100 text-green-700"
                  : o.value === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {o.icon} {o.label}
          </button>
        ))}
      </div>

      {/* Advanced */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">
              Department
            </label>
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange("department", e.target.value)}
              className="w-full px-2 py-1.5 border rounded-lg text-xs"
            >
              {departmentOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">
              Branch
            </label>
            <select
              value={filters.branch}
              onChange={(e) => handleFilterChange("branch", e.target.value)}
              className="w-full px-2 py-1.5 border rounded-lg text-xs"
            >
              {branchOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">
              Employee
            </label>
            <select
              value={filters.employee || "all"}
              onChange={(e) => handleFilterChange("employee", e.target.value)}
              className="w-full px-2 py-1.5 border rounded-lg text-xs"
            >
              <option value="all">All Employees</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFilters;
