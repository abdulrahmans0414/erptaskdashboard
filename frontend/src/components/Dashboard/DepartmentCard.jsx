import React from "react";

const DepartmentCard = ({ department, stats, onClick }) => {
  const completionRate =
    stats?.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0;

  const performanceColor =
    completionRate >= 80
      ? "text-emerald-500"
      : completionRate >= 50
        ? "text-amber-500"
        : "text-rose-500";

  const performanceBg =
    completionRate >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : completionRate >= 50
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:border-blue-200 transition-all duration-300 group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br ${department.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
            {department.icon}
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">{department.name}</h3>
            <p className="text-xs text-gray-500 font-medium">{stats?.total || 0} Total Tasks</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${performanceBg}`}>
          {completionRate}% Done
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-50 rounded-xl p-2 text-center group-hover:bg-blue-50/50 transition-colors">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Progress</p>
          <p className="font-bold text-blue-600 text-sm">{stats?.inProgress || 0}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2 text-center group-hover:bg-amber-50/50 transition-colors">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Pending</p>
          <p className="font-bold text-amber-600 text-sm">{stats?.pending || 0}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2 text-center group-hover:bg-emerald-50/50 transition-colors">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Done</p>
          <p className="font-bold text-emerald-600 text-sm">{stats?.completed || 0}</p>
        </div>
      </div>

      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${
            completionRate >= 80 ? "bg-emerald-500" : completionRate >= 50 ? "bg-amber-500" : "bg-rose-500"
          }`}
          style={{ width: `${completionRate}%` }}
        />
      </div>
    </div>
  );
};

export default DepartmentCard;
