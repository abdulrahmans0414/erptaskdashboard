// const colorStyles = {
//   purple: "from-purple-500 to-purple-600",
//   blue: "from-blue-500 to-blue-600",
//   green: "from-green-500 to-green-600",
//   orange: "from-orange-500 to-orange-600",
//   cyan: "from-cyan-500 to-cyan-600",
// };

// const DepartmentCard = ({ department }) => {
//   const { name, icon, color, tasks } = department;

//   const completionRate =
//     tasks?.total > 0 ? ((tasks.completed / tasks.total) * 100).toFixed(0) : 0;

//   return (
//     <div
//       className={`bg-gradient-to-br ${colorStyles[color]} rounded-xl p-4 text-white cursor-pointer hover:scale-105 transition transform`}
//     >
//       <div className="text-3xl mb-2">{icon}</div>
//       <h3 className="font-semibold">{name}</h3>
//       <div className="mt-3 text-sm">
//         <div className="flex justify-between">
//           <span>Tasks:</span>
//           <span className="font-bold">{tasks?.total || 0}</span>
//         </div>
//         <div className="flex justify-between mt-1">
//           <span>Completed:</span>
//           <span className="font-bold">{tasks?.completed || 0}</span>
//         </div>
//         <div className="mt-2">
//           <div className="w-full bg-white/30 rounded-full h-1.5">
//             <div
//               className="bg-white rounded-full h-1.5"
//               style={{ width: `${completionRate}%` }}
//             ></div>
//           </div>
//           <p className="text-xs mt-1 text-right">{completionRate}%</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DepartmentCard;
