// const colorClasses = {
//   blue: "bg-blue-100 text-blue-600",
//   green: "bg-green-100 text-green-600",
//   yellow: "bg-yellow-100 text-yellow-600",
//   purple: "bg-purple-100 text-purple-600",
// };

// const StatsCard = ({ title, value, icon, color, change }) => {
//   return (
//     <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition">
//       <div className="flex justify-between items-start">
//         <div>
//           <p className="text-gray-500 text-sm">{title}</p>
//           <p className="text-3xl font-bold mt-1">{value}</p>
//           {change && (
//             <p
//               className={`text-sm mt-2 ${change.startsWith("+") ? "text-green-600" : "text-red-600"}`}
//             >
//               {change}
//             </p>
//           )}
//         </div>
//         <div
//           className={`w-12 h-12 ${colorClasses[color]} rounded-full flex items-center justify-center text-2xl`}
//         >
//           {icon}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default StatsCard;
