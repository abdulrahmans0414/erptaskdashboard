import { useState, useEffect, useRef } from "react";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../../services/api";

const typeColors = {
  task_assigned: "bg-blue-100 text-blue-600",
  task_started: "bg-yellow-100 text-yellow-600",
  task_submitted: "bg-purple-100 text-purple-600",
  task_approved: "bg-green-100 text-green-600",
  task_rejected: "bg-red-100 text-red-600",
  registration_request: "bg-orange-100 text-orange-600",
  otp_sent: "bg-indigo-100 text-indigo-600",
  account_approved: "bg-green-100 text-green-600",
  account_rejected: "bg-red-100 text-red-600",
};
const typeIcons = {
  task_assigned: "📋",
  task_started: "▶️",
  task_submitted: "📤",
  task_approved: "✅",
  task_rejected: "❌",
  registration_request: "🆕",
  otp_sent: "🔑",
  account_approved: "✅",
  account_rejected: "❌",
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // all | unread
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getNotifications();
      if (r.data.success) {
        setNotifications(r.data.data);
        setUnread(r.data.unreadCount || 0);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const handleRead = async (id) => {
    await markAsRead(id);
    setNotifications((n) =>
      n.map((x) => (x._id === id ? { ...x, isRead: true } : x)),
    );
    setUnread((u) => Math.max(0, u - 1));
  };

  const handleReadAll = async () => {
    await markAllAsRead();
    setNotifications((n) => n.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
    setNotifications((n) => n.filter((x) => x._id !== id));
  };

  const visible =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) load();
        }}
        className="relative p-2 sm:p-2.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition"
        aria-label="Notifications"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold ring-2 ring-white animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden"
            onClick={() => setOpen(false)}
          />

          <div
            className="
              fixed sm:absolute top-14 sm:top-auto sm:mt-2 right-2 sm:right-0 left-2 sm:left-auto
              sm:w-96 max-w-[calc(100vw-1rem)]
              bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden
              animate-in fade-in slide-in-from-top-2
            "
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/60">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">
                  Notifications
                </h3>
                <p className="text-[11px] text-gray-500">
                  {unread > 0 ? `${unread} unread` : "All caught up 🎉"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={handleReadAll}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={load}
                  className="text-gray-400 hover:text-gray-700 text-sm"
                  aria-label="Refresh"
                >
                  🔄
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 px-3 pt-2">
              {[
                { k: "all", l: `All (${notifications.length})` },
                { k: "unread", l: `Unread (${unread})` },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setFilter(t.k)}
                  className={`text-[11px] font-medium px-3 py-1 rounded-full transition ${
                    filter === t.k
                      ? "bg-blue-600 text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>

            <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto mt-1">
              {loading && notifications.length === 0 ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : visible.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">🔔</div>
                  <p className="text-sm font-medium">
                    {filter === "unread"
                      ? "No unread notifications"
                      : "No notifications yet"}
                  </p>
                </div>
              ) : (
                visible.map((n) => (
                  <div
                    key={n._id}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition group relative ${
                      !n.isRead ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${typeColors[n.type] || "bg-gray-100 text-gray-600"}`}
                    >
                      {typeIcons[n.type] || "📢"}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => !n.isRead && handleRead(n._id)}
                    >
                      <p
                        className={`text-sm leading-tight ${!n.isRead ? "font-semibold text-gray-800" : "text-gray-600"}`}
                      >
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition">
                      {!n.isRead && (
                        <button
                          onClick={() => handleRead(n._id)}
                          className="text-[10px] text-blue-600 hover:underline whitespace-nowrap font-semibold"
                        >
                          Read
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n._id)}
                        className="text-[10px] text-red-500 hover:underline font-semibold"
                      >
                        Del
                      </button>
                    </div>
                    {!n.isRead && (
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-500 rounded-full" />
                    )}
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-2 text-center">
                <button className="text-xs text-blue-600 hover:underline font-semibold">
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
