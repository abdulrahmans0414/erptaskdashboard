import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  getAllPendingRegistrations,
  reviewRegistration,
} from "../../services/api";

const ROLE_COLORS = {
  employee: "bg-slate-100 text-slate-700 border-slate-200",
  hr: "bg-purple-100 text-purple-700 border-purple-200",
  it: "bg-blue-100 text-blue-700 border-blue-200",
  graphic: "bg-pink-100 text-pink-700 border-pink-200",
  "department-head": "bg-orange-100 text-orange-700 border-orange-200",
  "branch-head": "bg-indigo-100 text-indigo-700 border-indigo-200",
};

import toast from "react-hot-toast";

const StatusBadge = ({ status }) => {
  const map = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    otp_sent: "bg-blue-100 text-blue-700 border-blue-200",
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };
  const labels = {
    pending: "⏳ Pending",
    otp_sent: "🔑 OTP Sent",
    approved: "✅ Approved",
    rejected: "❌ Rejected",
  };
  return (
    <span
      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${map[status] || "bg-slate-100 text-slate-600 border-slate-200"}`}
    >
      {labels[status] || status}
    </span>
  );
};

export default function PendingRegistrations() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending,otp_sent");
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [otpInfo, setOtpInfo] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (message, type = "success") => {
    if (type === "success") toast.success(message);
    else toast.error(message);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = filter === "all" ? undefined : filter;
      const r = await getAllPendingRegistrations(statusParam);
      if (r.data.success) setRequests(r.data.data);
    } catch {
      showToast("Failed to load requests", "error");
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (id, action) => {
    setBusyId(id);
    try {
      const r = await reviewRegistration(id, action, adminNote);
      if (r.data.success) {
        showToast(r.data.message);
        if (action === "send_otp" && r.data.otp) {
          setOtpInfo({
            otp: r.data.otp,
            name: r.data.data.name,
            email: r.data.data.email,
            expiresAt: r.data.otpExpiresAt,
          });
        }
        setReviewing(null);
        setAdminNote("");
        load();
      } else {
        showToast(r.data.message || "Action failed", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Action failed", "error");
    }
    setBusyId(null);
  };

  const copyOtp = async () => {
    try {
      await navigator.clipboard.writeText(otpInfo.otp);
      showToast("OTP copied to clipboard");
    } catch {
      showToast("Couldn't copy", "error");
    }
  };

  const pending = (requests || []).filter((r) =>
    ["pending", "otp_sent"].includes(r?.status),
  );

  const visible = (requests || []).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r?.name?.toLowerCase().includes(q) ||
      r?.email?.toLowerCase().includes(q) ||
      r?.phone?.toLowerCase().includes(q) ||
      r?.department?.toLowerCase().includes(q) ||
      r?.branch?.toLowerCase().includes(q) ||
      r?.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full">
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes scaleIn { from { opacity:0; transform:scale(.96) } to { opacity:1; transform:scale(1) } }
      `}</style>

      {/* OTP Modal */}
      {otpInfo && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_.15s_ease-out]">
          <div className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm text-center animate-[scaleIn_.2s_ease-out]">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center text-3xl shadow-lg shadow-blue-200 mb-4">
              🔑
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              OTP Generated
            </h2>
            <p className="text-slate-500 text-sm mb-5">
              Share this OTP with <strong>{otpInfo.name}</strong>
              <br />
              <span className="text-xs text-slate-400">{otpInfo.email}</span>
            </p>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-2xl p-5 mb-3">
              <p className="text-4xl sm:text-5xl font-bold tracking-[0.4rem] sm:tracking-[0.5rem] text-blue-700 font-mono">
                {otpInfo.otp}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Valid for 30 minutes
              </p>
            </div>
            <button
              onClick={copyOtp}
              className="w-full mb-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition"
            >
              📋 Copy OTP
            </button>
            <p className="text-xs text-slate-400 mb-4">
              📞 Call or WhatsApp this OTP to the user.
            </p>
            <button
              onClick={() => setOtpInfo(null)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition shadow-lg shadow-blue-200"
            >
              Done
            </button>
          </div>
        </div>,
        document.getElementById("modal-root") || document.body
      )}

      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center text-xl shadow-lg shadow-blue-200">
              📋
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Registration Requests
              </h1>
              <p className="text-slate-500 text-sm">
                Review and approve employee access requests
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pending.length > 0 && (
              <span className="bg-red-100 text-red-700 font-bold text-sm px-3 py-1.5 rounded-full border border-red-200 animate-pulse">
                {pending.length} need review
              </span>
            )}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border border-slate-200/80 rounded-xl px-2.5 h-10 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="pending,otp_sent">Needs Action</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
            <button
              onClick={load}
              className="px-3 py-2 text-sm bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition font-medium"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, role, branch..."
            className="w-full bg-white border border-slate-200/80 rounded-xl pl-10 pr-4 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse"
              >
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-slate-200 rounded" />
                    <div className="h-3 w-1/2 bg-slate-100 rounded" />
                    <div className="h-3 w-2/5 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 py-16 text-center">
            <div className="text-6xl mb-3">✨</div>
            <p className="text-xl font-semibold text-slate-700">All clear!</p>
            <p className="text-slate-500 text-sm mt-1">
              No registration requests to show.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((req, i) => {
              const isPending = ["pending", "otp_sent"].includes(req.status);
              return (
                <div
                  key={req._id}
                  style={{ animationDelay: `${i * 25}ms` }}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all animate-[fadeIn_.4s_ease-out_both] ${
                    isPending
                      ? "border-slate-200"
                      : "border-slate-100 opacity-80"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-md shadow-blue-200">
                          {req.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 truncate">
                              {req.name}
                            </h3>
                            <StatusBadge status={req.status} />
                          </div>
                          <p className="text-slate-500 text-sm truncate">
                            {req.email}
                          </p>
                          {req.phone && (
                            <p className="text-slate-400 text-xs">
                              📞 {req.phone}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                                ROLE_COLORS[req.role] ||
                                "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {req.role}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100">
                              {req.department}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              📍 {req.branch}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100">
                              {new Date(req.createdAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                          {req.adminNote && (
                            <p className="text-xs text-slate-500 mt-2 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 italic">
                              Note: {req.adminNote}
                            </p>
                          )}
                          {req.privilegeRequestReason && (
                            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2 py-2">
                              <p className="text-[11px] font-semibold text-amber-800">
                                🔒 High-privilege request reason
                              </p>
                              <p className="text-xs text-amber-900/80 mt-1 whitespace-pre-wrap">
                                {req.privilegeRequestReason}
                              </p>
                            </div>
                          )}
                          {req.status === "otp_sent" && (
                            <p className="text-xs text-blue-600 mt-2 font-medium flex items-center gap-1">
                              🔑 OTP sent — waiting for user to verify
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {isPending && reviewing?.id !== req._id && (
                        <div className="flex flex-wrap gap-2 lg:flex-shrink-0">
                          {req.status === "pending" && (
                            <>
                              <button
                                disabled={busyId === req._id}
                                onClick={() =>
                                  handleAction(req._id, "send_otp")
                                }
                                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl transition font-medium shadow-md shadow-blue-200/70"
                              >
                                🔑 Send OTP
                              </button>
                              <button
                                disabled={busyId === req._id}
                                onClick={() =>
                                  handleAction(req._id, "approve_direct")
                                }
                                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl transition font-medium shadow-md shadow-emerald-200/70"
                              >
                                ✓ Approve
                              </button>
                            </>
                          )}
                          {req.status === "otp_sent" && (
                            <button
                              disabled={busyId === req._id}
                              onClick={() => handleAction(req._id, "send_otp")}
                              className="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition font-medium"
                            >
                              🔄 Resend OTP
                            </button>
                          )}
                          <button
                            onClick={() => setReviewing({ id: req._id })}
                            className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-medium"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}

                      {reviewing?.id === req._id && (
                        <div className="w-full lg:w-80">
                          <textarea
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            className="w-full px-2.5 py-2 border border-slate-200/80 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 mb-2 transition h-auto"
                            rows={2}
                            placeholder="Reason for rejection (optional)..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(req._id, "reject")}
                              className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition shadow-md shadow-red-200/70"
                            >
                              ✕ Confirm Reject
                            </button>
                            <button
                              onClick={() => {
                                setReviewing(null);
                                setAdminNote("");
                              }}
                              className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
