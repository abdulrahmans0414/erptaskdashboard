import { useState, useEffect } from "react";
import { getDashboardStats } from "../../services/api";
import { Bar } from "react-chartjs-2";
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
  const [empPage, setEmpPage] = useState(1);
  const [empLimit] = useState(10);

  useEffect(() => {
    loadStats(empPage);
  }, [empPage]);

  const loadStats = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDashboardStats({ empPage: page, empLimit });
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

  if (loading && !stats) {
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
        <p className="text-gray-650">{error}</p>
        <button
          onClick={() => loadStats(empPage)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto antialiased">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white shadow-sm">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>📊</span> Task Performance Reports
        </h1>
        <p className="text-sm opacity-90 mt-1">
          Track turnaround times, completion percentages & employee task delivery rates
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Tasks</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {stats?.summary?.totalTasks || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Completed Tasks</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {stats?.summary?.completedTasks || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pending Tasks</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {stats?.summary?.pendingTasks || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">On-Time Delivery</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {stats?.summary?.onTimeRate || 0}%
          </p>
        </div>
      </div>

      {/* Turnaround & Resolution Card */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h2 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
          <span>⏱️</span> Task Delivery & Turnaround Time
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100/60">
            <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Avg Turnaround Time</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">
              {stats?.summary?.avgCompletionDays || 0} Days
            </p>
            <p className="text-[10px] text-blue-500 mt-1.5">Average time from task creation to completion</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border border-green-100/60">
            <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">On-Time Delivery Rate</p>
            <p className="text-2xl font-bold text-green-800 mt-1">
              {stats?.summary?.onTimeRate || 0}%
            </p>
            <p className="text-[10px] text-green-500 mt-1.5">Percentage of tasks finished before deadline</p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100/60">
            <p className="text-xs text-red-700 font-semibold uppercase tracking-wide">Overdue Task Rate</p>
            <p className="text-2xl font-bold text-red-800 mt-1">
              {stats?.summary?.overdueRate || 0}%
            </p>
            <p className="text-[10px] text-red-500 mt-1.5">Active tasks currently past their due dates</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      {empNames.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="text-lg font-semibold mb-3 text-slate-800">📈 Top 10 Employees</h2>
          <div className="relative w-full h-64 max-h-[260px] overflow-hidden">
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "top" } },
                scales: {
                  y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: "rgba(0,0,0,0.05)" } },
                  x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Employee Performance Table with pagination */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-1.5">
            <span>👥</span> Employee Performance
          </h2>
          {stats?.employeePagination && (
            <span className="text-xs text-slate-400 font-semibold">
              Page {stats.employeePagination.page} of {stats.employeePagination.pages || 1}
            </span>
          )}
        </div>
        <div className="w-full overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-600">
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wide">Employee</th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wide">Department</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wide">Total Tasks</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wide">Completed</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wide">Pending</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wide">Completion Rate</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wide">On-Time Rate</th>
                <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wide">Avg Turnaround</th>
              </tr>
            </thead>
            <tbody>
              {stats?.employeePerformance?.map((emp) => (
                <tr key={emp.id} className="border-b hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 font-medium text-slate-800">{emp.name}</td>
                  <td className="py-3.5 px-4 text-slate-500">{emp.department}</td>
                  <td className="text-center py-3.5 px-4 font-semibold text-slate-700">{emp.totalTasks}</td>
                  <td className="text-center py-3.5 px-4 text-green-600 font-semibold">
                    {emp.completedTasks}
                  </td>
                  <td className="text-center py-3.5 px-4 text-amber-600 font-semibold">
                    {emp.pendingTasks}
                  </td>
                  <td className="text-center py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                      {emp.completionRate}%
                    </span>
                  </td>
                  <td className="text-center py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        emp.onTimeRate >= 80
                          ? "bg-green-50 text-green-700 ring-1 ring-green-100"
                          : emp.onTimeRate >= 50
                            ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                            : "bg-red-50 text-red-700 ring-1 ring-red-100"
                      }`}
                    >
                      {emp.onTimeRate}%
                    </span>
                  </td>
                  <td className="text-center py-3.5 px-4 text-slate-550 font-medium">
                    {emp.avgCompletionDays > 0 ? `${emp.avgCompletionDays} Days` : "N/A"}
                  </td>
                </tr>
              ))}
              {(!stats?.employeePerformance ||
                stats.employeePerformance.length === 0) && (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">
                    No employee performance data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {stats?.employeePagination && stats.employeePagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t">
            <span className="text-xs text-slate-500 font-medium">
              Showing employees <strong>{(empPage - 1) * empLimit + 1}</strong> - <strong>{Math.min(empPage * empLimit, stats.employeePagination.total)}</strong> of <strong>{stats.employeePagination.total}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setEmpPage((p) => Math.max(1, p - 1))}
                disabled={empPage === 1}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                ◀ Prev
              </button>
              {Array.from({ length: stats.employeePagination.pages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setEmpPage(i + 1)}
                  className={`w-8 h-8 rounded-xl text-xs font-semibold transition ${
                    empPage === i + 1
                      ? "bg-blue-600 text-white shadow-sm font-bold"
                      : "bg-white border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setEmpPage((p) => Math.min(stats.employeePagination.pages, p + 1))}
                disabled={empPage === stats.employeePagination.pages}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Trend */}
      {stats?.weeklyTrend && stats.weeklyTrend.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">📅 Weekly Trend</h2>
          <div className="space-y-3">
            {stats.weeklyTrend.map((day) => (
              <div key={day.day} className="flex items-center gap-4">
                <div className="w-24 text-sm font-semibold text-slate-600">
                  {day.day}
                </div>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="bg-green-500 h-full text-[10px] text-white flex items-center justify-center font-bold"
                    style={{
                      width: `${(day.completed / (day.completed + day.pending || 1)) * 100}%`,
                    }}
                  >
                    {day.completed > 0 && day.completed}
                  </div>
                  <div
                    className="bg-yellow-400 h-full text-[10px] text-white flex items-center justify-center font-bold"
                    style={{
                      width: `${(day.pending / (day.completed + day.pending || 1)) * 100}%`,
                    }}
                  >
                    {day.pending > 0 && day.pending}
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-semibold w-24">
                  ✅ {day.completed} Done · ⏳ {day.pending} Active
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
