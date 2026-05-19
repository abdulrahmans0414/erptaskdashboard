import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmailLogs, deleteEmailLog, resendEmailLog } from '../../services/api/emailLogApi';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function EmailCenter() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin';

    // State parameters
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFolder, setActiveFolder] = useState('ALL'); // ALL, TASKS, SECURITY, WELCOME, SENT, FAILED
    const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 15 });
    
    // Preview Email Modal State
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Use a stable ref for limit to avoid infinite re-renders
    const limitRef = useRef(pagination.limit);

    // Fetch Logs
    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: limitRef.current,
                search: searchQuery
            };

            // Map folder categorization to query params
            if (activeFolder === 'SENT') {
                params.status = 'sent';
            } else if (activeFolder === 'FAILED') {
                params.status = 'failed';
            } else if (activeFolder === 'SECURITY') {
                params.type = 'OTP';
            } else if (activeFolder === 'WELCOME') {
                params.type = 'WELCOME';
            }
            // For TASKS we do NOT pass a type — let backend return all and we filter
            // (avoids only showing TASK_ASSIGNED, misses TASK_APPROVED etc.)

            const response = await getEmailLogs(params);
            
            if (response.data?.success) {
                let retrievedLogs = Array.isArray(response.data.data) ? response.data.data : [];
                
                // Client-side filter for TASKS folder — show all TASK_* types
                if (activeFolder === 'TASKS') {
                    retrievedLogs = retrievedLogs.filter(log => log?.type?.startsWith('TASK_'));
                }

                setLogs(retrievedLogs);
                if (response.data.pagination) {
                    setPagination(response.data.pagination);
                }
            }
        } catch (error) {
            console.error('Failed to load email logs:', error);
            toast.error(error.response?.data?.message || 'Error fetching email logs');
        } finally {
            setLoading(false);
        }
    }, [activeFolder, searchQuery]);

    // Fetch logs on mount, folder change, or search query change
    useEffect(() => {
        const delaySearch = setTimeout(() => {
            fetchLogs(1);
        }, 300);

        return () => clearTimeout(delaySearch);
    }, [activeFolder, searchQuery]);

    // Handle Delete
    const handleDelete = async (id, e) => {
        e?.stopPropagation(); // Prevent opening preview modal
        if (!window.confirm('Are you sure you want to delete this email log?')) return;

        setActionLoading(true);
        try {
            const response = await deleteEmailLog(id);
            if (response.data.success) {
                toast.success('Email log deleted successfully');
                if (selectedEmail?._id === id) {
                    setSelectedEmail(null);
                }
                
                // Backtrack page if we deleted the last item on a non-first page
                if (logs.length === 1 && pagination.page > 1) {
                    fetchLogs(pagination.page - 1);
                } else {
                    fetchLogs(pagination.page);
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete email log');
        } finally {
            setActionLoading(false);
        }
    };

    // Handle Resend
    const handleResend = async (id, e) => {
        e?.stopPropagation();
        setActionLoading(true);
        const resendPromise = resendEmailLog(id);

        toast.promise(resendPromise, {
            loading: 'Resending email via SMTP...',
            success: 'Email resent successfully! 🚀',
            error: (err) => err.response?.data?.message || 'Failed to resend email'
        });

        try {
            await resendPromise;
            fetchLogs(pagination.page);
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };

    // Format Date Utility
    const formatEmailDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString('en-IN', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    };

    // Helper to get relative time for detailed preview
    const formatFullDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    // Get Badge Styles
    const getTypeBadge = (type) => {
        const config = {
            OTP: { label: '🔑 OTP & Security', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
            WELCOME: { label: '🎉 Welcome', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            TASK_ASSIGNED: { label: '📋 Task Assigned', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
            TASK_SUBMITTED: { label: '📤 Task Review', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
            TASK_APPROVED: { label: '✅ Approved', bg: 'bg-green-50 text-green-700 border-green-200' },
            TASK_REJECTED: { label: '🔄 Rejected/Rework', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
            TASK_UPDATED: { label: '📝 Task Update', bg: 'bg-slate-50 text-slate-700 border-slate-200' },
        };
        return config[type] || { label: type, bg: 'bg-gray-50 text-gray-700 border-gray-200' };
    };

    return (
        <div className="p-2 sm:p-4 max-w-7xl mx-auto h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] flex flex-col font-sans text-slate-800 bg-[#f6f8fc]">
            
            {/* Gmail Top Header Bar */}
            <div className="flex items-center justify-between px-3 py-2 md:px-6 md:py-3 bg-[#f6f8fc] rounded-2xl mb-3 flex-shrink-0 gap-4">
                {/* Left Logo / Hamburger */}
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden p-2 hover:bg-slate-200/60 rounded-full text-slate-600 transition"
                    >
                        ☰
                    </button>
                    {/* Gmail Logo Replica */}
                    <div className="flex items-center gap-2">
                        {/* Google Mail M Icon SVG */}
                        <svg className="w-6 h-6 text-[#ea4335]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                        </svg>
                        <span className="text-lg font-bold text-slate-700 tracking-tight hidden sm:inline-block">
                            Gmail <span className="text-[9px] bg-[#ea4335] text-white font-bold px-1.5 py-0.5 rounded-full ml-1 uppercase">ERP</span>
                        </span>
                    </div>
                </div>

                {/* Central Rounded Search Pill */}
                <div className="flex-1 max-w-3xl relative flex items-center bg-[#eaf1fb] hover:bg-[#eaf1fb]/80 hover:shadow-sm focus-within:bg-white focus-within:shadow-md transition-all duration-200 rounded-full px-4 h-10 md:h-12 border border-transparent focus-within:border-slate-200">
                    <span className="text-slate-500 text-lg flex-shrink-0">🔍</span>
                    <input
                        type="text"
                        placeholder="Search in mail"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent pl-3 pr-2 focus:outline-none text-slate-800 placeholder-slate-500 text-sm h-full"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="text-slate-400 hover:text-slate-600 text-sm p-1"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Right Profile Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button 
                        onClick={() => fetchLogs(pagination.page)} 
                        disabled={loading || actionLoading}
                        className="p-2 hover:bg-slate-200/60 rounded-full text-slate-600 transition disabled:opacity-50"
                        title="Refresh mail"
                    >
                        🔄
                    </button>
                    {/* User Avatar Circle */}
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center shadow-sm text-sm border-2 border-white select-none" title={`${user?.name} (${user?.role})`}>
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>

            {/* Main Gmail Layout Pane */}
            <div className="bg-[#f6f8fc] flex-grow overflow-hidden flex -mx-2 sm:mx-0">
                
                {/* Left Sidebar Folders - Permanently visible on desktop, sliding overlay drawer on mobile */}
                <div 
                    className={`
                        fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none md:static md:z-0 transition-all duration-300
                        ${isSidebarOpen ? 'flex animate-fade-in' : 'hidden md:flex'}
                    `}
                    onClick={() => setIsSidebarOpen(false)}
                >
                    <div 
                        className="w-64 bg-[#f6f8fc] p-4 h-full flex flex-col flex-shrink-0 shadow-2xl md:shadow-none animate-slide-in-left md:animate-none"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drawer Header for Mobile */}
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/60 md:hidden flex-shrink-0">
                            <span className="text-sm font-bold text-slate-800">Categories</span>
                            <button 
                                onClick={() => setIsSidebarOpen(false)}
                                className="p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-1">
                            {[
                                { id: 'ALL', label: 'All Mail', icon: '✉️' },
                                { id: 'TASKS', label: 'Task Alerts', icon: '📋' },
                                { id: 'SECURITY', label: 'OTP & Security', icon: '🔑' },
                                { id: 'WELCOME', label: 'Welcome Mail', icon: '🎉' },
                                { id: 'SENT', label: 'Sent', icon: '✅' },
                                { id: 'FAILED', label: 'Failed Deliveries', icon: '❌' },
                            ].map((folder) => (
                                <button
                                    key={folder.id}
                                    onClick={() => {
                                        setActiveFolder(folder.id);
                                        setPagination(prev => ({ ...prev, page: 1 }));
                                        setIsSidebarOpen(false); // Close sidebar drawer on category select
                                    }}
                                    className={`w-full flex items-center justify-between px-5 py-2.5 rounded-r-full text-sm font-semibold transition-all duration-150 gap-3
                                        ${activeFolder === folder.id 
                                            ? 'bg-[#c2e7ff] text-[#001d35] font-bold' 
                                            : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-base">{folder.icon}</span>
                                        <span>{folder.label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-auto bg-slate-100/80 rounded-2xl p-4 border border-slate-200/50">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">My Mail Scoping</h4>
                            <div className="space-y-1 text-xs text-slate-600">
                                <p>🧑‍💼 <strong>User:</strong> {user?.name}</p>
                                <p>🛡️ <strong>Role:</strong> <span className="capitalize">{user?.role?.replace(/-/g, ' ')}</span></p>
                                <div className="border-t border-slate-200/60 my-2"></div>
                                <p className="text-[11px] leading-relaxed text-slate-400 italic">
                                    {isAdmin 
                                        ? "Global Admin View - showing all email logs in the database." 
                                        : "Scoped View - showing only emails sent to your address or initiated by you."
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Mail Area Container */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white md:rounded-3xl border border-[#e0e3e9] shadow-sm">
                    
                    {/* Top Action Header Bar */}
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
                        {/* Checkbox selector */}
                        <div className="flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                className="rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer hidden sm:block" 
                            />
                            <span className="text-slate-400 text-xs hidden sm:inline select-none">Select All</span>
                        </div>

                        {/* Pagination controls */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                            <span className="text-xs text-slate-500 font-semibold select-none">
                                {pagination.total > 0 
                                    ? `${(pagination.page - 1) * pagination.limit + 1} - ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`
                                    : '0 - 0 of 0'
                                }
                            </span>
                            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                <button
                                    onClick={() => fetchLogs(pagination.page - 1)}
                                    disabled={pagination.page === 1 || loading}
                                    className="px-3 py-1.5 hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition duration-150 border-r border-slate-100"
                                    aria-label="Previous page"
                                >
                                    ◀
                                </button>
                                <button
                                    onClick={() => fetchLogs(pagination.page + 1)}
                                    disabled={pagination.page === pagination.pages || loading}
                                    className="px-3 py-1.5 hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition duration-150"
                                    aria-label="Next page"
                                >
                                    ▶
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Email List Content */}
                    <div className="flex-grow overflow-y-auto min-h-0">
                        {loading ? (
                            // Render skeleton loader rows
                            <div className="divide-y divide-slate-100">
                                {[...Array(6)].map((_, idx) => (
                                    <div key={idx} className="p-4 flex items-center gap-4 animate-pulse">
                                        <div className="w-10 h-10 bg-slate-100 rounded-full"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                                            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                        </div>
                                        <div className="w-12 h-6 bg-slate-100 rounded-full"></div>
                                    </div>
                                ))}
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50/10">
                                <span className="text-5xl mb-3 animate-bounce">📭</span>
                                <h3 className="text-lg font-bold text-slate-800">No emails found</h3>
                                <p className="text-slate-400 max-w-sm text-sm mt-1">
                                    No email dispatch matches the selected criteria. New task updates and OTP operations will record logs here.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {logs.map((log) => {
                                    const typeInfo = getTypeBadge(log.type);
                                    return (
                                        <div
                                            key={log._id}
                                            onClick={() => setSelectedEmail(log)}
                                            className="px-4 py-2.5 flex items-center justify-between gap-4 cursor-pointer border-b border-slate-100 hover:shadow-sm hover:z-10 bg-white hover:bg-slate-50 transition duration-150 group relative"
                                        >
                                            {/* Left Icons Selection & Star */}
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <input 
                                                    type="checkbox" 
                                                    onClick={(e) => e.stopPropagation()} 
                                                    className="rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer hidden sm:block" 
                                                />
                                                <span 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toast.success("Conversation starred!");
                                                    }} 
                                                    className="text-slate-300 hover:text-amber-400 text-lg transition duration-150 select-none hidden sm:block cursor-pointer"
                                                    title="Star conversation"
                                                >
                                                    ☆
                                                </span>
                                            </div>

                                            {/* Sender / Recipient details */}
                                            <div className="flex items-center gap-4 min-w-0 flex-grow md:flex-initial md:w-64 flex-shrink-0">
                                                {/* Small rounded dynamic category avatar */}
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 font-semibold text-xs shadow-sm flex-shrink-0">
                                                    {log.type === 'OTP' ? '🔑' : log.type === 'WELCOME' ? '🎉' : '📋'}
                                                </div>
                                                <span className="text-xs md:text-sm font-semibold text-slate-800 truncate max-w-[140px] sm:max-w-xs md:max-w-md" title={log.recipient}>
                                                    {log.recipient}
                                                </span>
                                            </div>

                                            {/* Subject & Snippet (Unified chain in Gmail Web Style) */}
                                            <div className="min-w-0 flex-1 hidden md:block">
                                                <div className="text-xs truncate max-w-sm sm:max-w-xl pr-6 flex items-center gap-1.5">
                                                    <span className="text-slate-800 font-bold flex-shrink-0">{log.subject}</span>
                                                    <span className="text-slate-300 font-normal">-</span>
                                                    <span className="text-slate-400 font-normal truncate flex-grow">
                                                        {log.contentSnippet || "No summary text is available for this log."}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Mobile View with compact stacked layout */}
                                            <div className="min-w-0 flex-1 md:hidden">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <span className="text-xs font-bold text-slate-700 truncate">{log.subject}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                    {log.contentSnippet || "No summary text is available."}
                                                </p>
                                            </div>

                                            {/* Right side: Badge Status, Date & Actions */}
                                            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                                                {/* Status indicators */}
                                                <span className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-md font-bold text-center border uppercase tracking-wider whitespace-nowrap
                                                    ${log.status === 'sent' 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                                    }`}
                                                >
                                                    {log.status}
                                                </span>

                                                {/* Date text */}
                                                <span className="text-xs text-slate-400 font-medium min-w-[55px] md:min-w-[70px] text-right">
                                                    {formatEmailDate(log.createdAt)}
                                                </span>

                                                {/* Hover quick action buttons (Desktop Only) */}
                                                <div className="opacity-0 group-hover:opacity-100 hidden md:flex items-center gap-1.5 absolute right-4 bg-gradient-to-l from-slate-50 via-slate-50 pl-8 h-full top-0">
                                                    <button
                                                        onClick={(e) => handleResend(log._id, e)}
                                                        disabled={actionLoading}
                                                        title="Resend email instantly"
                                                        className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center text-sm shadow-sm transition border border-blue-200 disabled:opacity-50"
                                                    >
                                                        🚀
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(log._id, e)}
                                                        disabled={actionLoading}
                                                        title="Delete log record"
                                                        className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center text-sm shadow-sm transition border border-rose-200 disabled:opacity-50"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Email Preview Slide-out Pane / Modal */}
            {selectedEmail && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-end animate-fade-in">
                    <div className="bg-white w-full md:w-[650px] h-[92vh] md:h-full shadow-2xl p-4 md:p-6 flex flex-col animate-slide-in relative md:border-l border-slate-200 rounded-t-3xl md:rounded-t-none">
                        
                        {/* Modal Header */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 flex-shrink-0">
                            <div className="flex items-center justify-between sm:justify-start gap-3">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedEmail(null)}
                                        className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition text-sm font-semibold"
                                    >
                                        ◀ Back
                                    </button>
                                    <div className="h-4 w-px bg-slate-200"></div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getTypeBadge(selectedEmail.type).bg} font-bold`}>
                                        {getTypeBadge(selectedEmail.type).label}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSelectedEmail(null)}
                                    className="sm:hidden p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="flex items-center gap-2 justify-end sm:justify-start">
                                <button
                                    onClick={(e) => handleResend(selectedEmail._id, e)}
                                    disabled={actionLoading}
                                    className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 shadow-sm transition duration-150 disabled:opacity-50 flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
                                >
                                    <span>🚀</span> Resend
                                </button>
                                <button
                                    onClick={(e) => handleDelete(selectedEmail._id, e)}
                                    disabled={actionLoading}
                                    className="px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 shadow-sm transition duration-150 disabled:opacity-50 flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
                                >
                                    <span>🗑️</span> Delete
                                </button>
                                <button
                                    onClick={() => setSelectedEmail(null)}
                                    className="hidden sm:block p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Subject Header */}
                        <div className="py-3 md:py-4 border-b border-slate-100 flex-shrink-0">
                            <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-3">
                                {selectedEmail.subject}
                            </h2>
                        </div>

                        {/* Delivery Meta Information */}
                        <div className="py-3 md:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 flex-shrink-0 bg-slate-50/50 -mx-4 md:-mx-6 px-4 md:px-6">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                                    {selectedEmail.recipient.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-xs min-w-0">
                                    <p className="text-slate-700 truncate">
                                        <strong>To:</strong>{' '}
                                        <span
                                            onClick={() => {
                                                if (selectedEmail.recipient.toLowerCase().trim() === user?.email?.toLowerCase().trim()) {
                                                    setSelectedEmail(null);
                                                    navigate('/profile');
                                                } else if (['admin', 'branch-head', 'department-head', 'hr'].includes(user?.role)) {
                                                    setSelectedEmail(null);
                                                    navigate(`/admin/users?search=${encodeURIComponent(selectedEmail.recipient)}`);
                                                }
                                            }}
                                            className={`font-semibold cursor-pointer ${
                                                (selectedEmail.recipient.toLowerCase().trim() === user?.email?.toLowerCase().trim() ||
                                                ['admin', 'branch-head', 'department-head', 'hr'].includes(user?.role))
                                                    ? 'hover:underline text-blue-600'
                                                    : ''
                                            }`}
                                            title="Click to view profile / user search"
                                        >
                                            {selectedEmail.recipient}
                                        </span>
                                    </p>
                                    <p className="text-slate-400 mt-0.5 truncate">
                                        <strong>From:</strong> System Notifications &lt;system@spis.com&gt;
                                    </p>
                                </div>
                            </div>
                            <div className="text-left sm:text-right flex-shrink-0">
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider
                                    ${selectedEmail.status === 'sent' 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                >
                                    {selectedEmail.status}
                                </span>
                                <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                                    {formatFullDate(selectedEmail.createdAt)}
                                </p>
                            </div>
                        </div>

                        {/* Visual High-Fidelity Email HTML Preview Screen */}
                        <div className="flex-grow overflow-y-auto p-4 bg-slate-100 border border-slate-200 rounded-2xl my-4 min-h-0 flex flex-col justify-start">
                            {selectedEmail.status === 'failed' && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4 flex items-start gap-3 flex-shrink-0">
                                    <span className="text-xl">⚠️</span>
                                    <div className="text-xs">
                                        <h4 className="font-bold text-rose-800 uppercase tracking-wider">SMTP Delivery Failure Details</h4>
                                        <p className="text-rose-700 mt-1 font-semibold">{selectedEmail.error || 'Unknown network failure.'}</p>
                                    </div>
                                </div>
                            )}

                            {/* Letterhead Container Visual Template replica */}
                            <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-lg mx-auto w-full overflow-hidden flex flex-col flex-shrink-0">
                                
                                {/* School Header */}
                                <div className="p-8 text-center bg-white border-b border-slate-100">
                                    <div className="text-2xl font-extrabold text-blue-800 tracking-tight">
                                        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">SPIS</span> Task Controller
                                    </div>
                                    <div className="h-1 w-10 bg-blue-600 mx-auto mt-2.5 rounded-full"></div>
                                </div>

                                {/* Hero Hero Section */}
                                <div className="px-8 pt-6 pb-4 text-center">
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {selectedEmail.type === 'OTP' 
                                            ? 'Security OTP Code' 
                                            : selectedEmail.type === 'WELCOME' 
                                                ? 'Welcome to TaskGrid ERP!' 
                                                : selectedEmail.subject
                                        }
                                    </h3>
                                </div>

                                {/* Main HTML Content Card */}
                                <div className="px-8 pb-8">
                                    <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100 text-sm text-slate-600 leading-relaxed space-y-4">
                                        
                                        {/* OTP Specific Visual */}
                                        {selectedEmail.type === 'OTP' && (
                                            <div className="space-y-4">
                                                <p>Hello 👋</p>
                                                <p>Great news! Your account registration has been approved. Use the secure OTP code below to activate your system account:</p>
                                                <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-5 text-center my-3">
                                                    <span className="text-xs uppercase font-bold tracking-widest text-slate-400">One-Time Password</span>
                                                    <div className="text-3xl font-extrabold font-mono tracking-[8px] text-blue-700 mt-2">
                                                        {selectedEmail.contentSnippet?.replace('OTP: ', '').trim() || '******'}
                                                    </div>
                                                    <span className="text-[10px] text-red-500 mt-2 block font-semibold">⏰ Valid for 15 minutes</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400">⚠️ Never share your OTP with anyone. If you didn't initiate this request, contact your administrator.</p>
                                            </div>
                                        )}

                                        {/* Welcome Specific Visual */}
                                        {selectedEmail.type === 'WELCOME' && (
                                            <div className="space-y-4">
                                                <p>Hello {selectedEmail.recipient.split('@')[0]}! 🎉</p>
                                                <p>Your TaskGrid ERP performance management profile has been successfully activated. You can now login, track your assignments, and file report audits.</p>
                                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                                    <h5 className="font-bold text-emerald-800 text-xs uppercase mb-2">🚀 Profile Configuration</h5>
                                                    <ul className="space-y-1 text-emerald-700 text-xs">
                                                        <li>• <strong>Email:</strong> {selectedEmail.recipient}</li>
                                                        <li>• <strong>Status:</strong> Active</li>
                                                        <li>• <strong>Portal URL:</strong> http://localhost:5173</li>
                                                    </ul>
                                                </div>
                                                <div className="text-center pt-2">
                                                    <button className="bg-emerald-600 text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-md hover:bg-emerald-700 transition">
                                                        Login to TaskGrid ERP →
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Task Specific Visuals */}
                                        {selectedEmail.type.startsWith('TASK_') && (
                                            <div className="space-y-4">
                                                <p>Hello Assignee 👋</p>
                                                
                                                <p>
                                                    {selectedEmail.type === 'TASK_ASSIGNED' && "A new core performance task has been assigned to you. Please audit the task variables and trigger progress logs."}
                                                    {selectedEmail.type === 'TASK_SUBMITTED' && "A task has been submitted for department heads/branch head audit. Action may be pending."}
                                                    {selectedEmail.type === 'TASK_APPROVED' && "Great work! The submitted task progress has been approved by management."}
                                                    {selectedEmail.type === 'TASK_REJECTED' && "A submitted task was evaluated and rejected. Task rework and correction is required."}
                                                    {selectedEmail.type === 'TASK_UPDATED' && "One of your assigned tasks has been updated. Please inspect the latest criteria."}
                                                </p>

                                                <div className="bg-blue-50/50 border border-slate-200/50 rounded-xl p-4 text-xs space-y-2">
                                                    <h5 className="font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5 mb-2">
                                                        📋 Task Parameters
                                                    </h5>
                                                    {selectedEmail.taskId ? (
                                                        <>
                                                            <p className="text-slate-700"><strong>Title:</strong> {selectedEmail.taskId.title}</p>
                                                            <p className="text-slate-700"><strong>Priority:</strong> <span className="capitalize px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800 font-bold border">{selectedEmail.taskId.priority}</span></p>
                                                            <p className="text-slate-700"><strong>Due Date:</strong> {selectedEmail.taskId.dueDate ? new Date(selectedEmail.taskId.dueDate).toLocaleDateString() : 'N/A'}</p>
                                                        </>
                                                    ) : (
                                                        <p className="text-slate-400 italic">Task details no longer available on database.</p>
                                                    )}
                                                </div>

                                                {selectedEmail.contentSnippet && (
                                                    <div className="bg-slate-100/50 border-l-4 border-slate-300 p-3.5 text-xs text-slate-500 rounded-r-lg italic">
                                                        💬 <strong>Manager Note:</strong> "{selectedEmail.contentSnippet}"
                                                    </div>
                                                )}

                                                <div className="text-center pt-2">
                                                    <button
                                                        onClick={() => {
                                                            if (selectedEmail.taskId) {
                                                                setSelectedEmail(null);
                                                                navigate(`/tasks?search=${encodeURIComponent(selectedEmail.taskId.title || '')}`);
                                                            }
                                                        }}
                                                        className="bg-blue-600 text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-md hover:bg-blue-700 transition"
                                                    >
                                                        Inspect in Workspace →
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* School Footer */}
                                <div className="p-5 text-center bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400">
                                    Scholars Paradise International School • Automated System Dispatch
                                </div>
                            </div>
                        </div>

                        {/* Attachments Section */}
                        {selectedEmail.attachments?.length > 0 && (
                            <div className="border-t border-slate-200 pt-4 flex-shrink-0">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attachments ({selectedEmail.attachments.length})</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedEmail.attachments.map((att, idx) => (
                                        <div key={idx} className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50 text-slate-700 font-semibold shadow-sm">
                                            <span>📎</span>
                                            <span className="truncate max-w-[150px]">{att.filename}</span>
                                            {att.fileSize && (
                                                <span className="text-slate-400">({Math.round(att.fileSize / 1024)} KB)</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
