import { useState, useEffect } from "react";
import { getDashboardStats } from "../../services/api";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
);

const TaskPerformance = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDashboardStats();
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setError(response.data.message || "Failed to load stats");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to load performance data");
    }
    setLoading(false);
  };

  const formatTime = (minutes) => {
    if (!minutes || minutes === 0) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Chart data
  const empNames =
    stats?.employeePerformance?.slice(0, 10).map((e) => e.name.split(" ")[0]) ||
    [];
  const empCompletion =
    stats?.employeePerformance?.slice(0, 10).map((e) => e.completedTasks) || [];
  const empTotal =
    stats?.employeePerformance?.slice(0, 10).map((e) => e.totalTasks) || [];

  const barChartData = {
    labels: empNames,
    datasets: [
      {
        label: "Total Tasks",
        data: empTotal,
        backgroundColor: "#3b82f6",
        borderRadius: 4,
      },
      {
        label: "Completed",
        data: empCompletion,
        backgroundColor: "#22c55e",
        borderRadius: 4,
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={loadStats}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
        <h1 className="text-2xl font-bold text-white">📊 Task Performance</h1>
        <p className="text-sm opacity-90 mt-1">
          Track completion rates, time efficiency & team performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
          <p className="text-gray-500 text-xs">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-800">
            {stats?.summary?.totalTasks || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
          <p className="text-gray-500 text-xs">Completed</p>
          <p className="text-2xl font-bold text-green-600">
            {stats?.summary?.completedTasks || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
          <p className="text-gray-500 text-xs">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {stats?.summary?.pendingTasks || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
          <p className="text-gray-500 text-xs">On-Time Rate</p>
          <p className="text-2xl font-bold text-blue-600">
            {stats?.summary?.onTimeRate || 0}%
          </p>
        </div>
      </div>

      {/* Time Performance */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">⏱️ Time Efficiency</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-xs text-gray-500">Estimated Time</p>
            <p className="text-xl font-bold text-blue-600">
              {formatTime((stats?.summary?.totalEstimatedHours || 0) * 60)}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-xs text-gray-500">Actual Time</p>
            <p className="text-xl font-bold text-green-600">
              {formatTime((stats?.summary?.totalActualHours || 0) * 60)}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-xs text-gray-500">Accuracy</p>
            <p
              className={`text-xl font-bold ${(stats?.summary?.timeAccuracy || 0) <= 110 ? "text-green-600" : "text-red-600"}`}
            >
              {stats?.summary?.timeAccuracy || 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      {empNames.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="text-lg font-semibold mb-3">📈 Top 10 Employees</h2>
          <div className="h-64">
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "top" } },
              }}
            />
          </div>
        </div>
      )}

      {/* Employee Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">👥 Employee Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4">Employee</th>
                <th className="text-left py-3 px-4">Department</th>
                <th className="text-center py-3 px-4">Tasks</th>
                <th className="text-center py-3 px-4">Done</th>
                <th className="text-center py-3 px-4">Time</th>
                <th className="text-center py-3 px-4">Accuracy</th>
                <th className="text-center py-3 px-4">Avg/Task</th>
              </tr>
            </thead>
            <tbody>
              {stats?.employeePerformance?.map((emp) => (
                <tr key={emp.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{emp.name}</td>
                  <td className="py-3 px-4 text-gray-500">{emp.department}</td>
                  <td className="text-center py-3 px-4">{emp.totalTasks}</td>
                  <td className="text-center py-3 px-4 text-green-600 font-medium">
                    {emp.completedTasks}
                  </td>
                  <td className="text-center py-3 px-4">
                    {formatTime(emp.totalTimeSpent)}
                  </td>
                  <td className="text-center py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.accuracy <= 110
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {emp.accuracy}%
                    </span>
                  </td>
                  <td className="text-center py-3 px-4">
                    {formatTime(emp.avgTimePerTask)}
                  </td>
                </tr>
              ))}
              {(!stats?.employeePerformance ||
                stats.employeePerformance.length === 0) && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-400">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly Trend */}
      {stats?.weeklyTrend && stats.weeklyTrend.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">📅 Weekly Trend</h2>
          <div className="space-y-3">
            {stats.weeklyTrend.map((day) => (
              <div key={day.day} className="flex items-center gap-4">
                <div className="w-16 text-sm font-medium text-gray-600">
                  {day.day}
                </div>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="bg-green-500 h-full text-[10px] text-white flex items-center justify-center"
                    style={{
                      width: `${(day.completed / (day.completed + day.pending || 1)) * 100}%`,
                    }}
                  >
                    {day.completed > 0 && day.completed}
                  </div>
                  <div
                    className="bg-yellow-400 h-full text-[10px] text-white flex items-center justify-center"
                    style={{
                      width: `${(day.pending / (day.completed + day.pending || 1)) * 100}%`,
                    }}
                  >
                    {day.pending > 0 && day.pending}
                  </div>
                </div>
                <div className="text-xs text-gray-500 w-20">
                  ✅{day.completed} ⏳{day.pending}
                </div>
                <div className="text-xs text-gray-400 w-20">
                  ⏱️{formatTime(day.totalTimeSpent)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskPerformance;
