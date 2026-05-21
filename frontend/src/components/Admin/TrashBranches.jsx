import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getDeletedBranches, restoreBranch } from "../../services/api";
import toast from "react-hot-toast";

const TrashBranches = () => {
  const [deletedBranches, setDeletedBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [restoringId, setRestoringId] = useState(null);

  const loadDeleted = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDeletedBranches();
      if (response.data.success) {
        setDeletedBranches(response.data.data || []);
      } else {
        toast.error("Failed to load deleted branches");
      }
    } catch (error) {
      console.error("Error loading deleted branches:", error);
      toast.error("Failed to load deleted branches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeleted();
  }, [loadDeleted]);

  const handleRestore = async (id, name) => {
    setRestoringId(id);
    try {
      const response = await restoreBranch(id);
      if (response.data.success) {
        toast.success(`🏢 Branch "${name}" restored successfully!`);
        setDeletedBranches((prev) => prev.filter((b) => b._id !== id));
      } else {
        toast.error(response.data.message || "Failed to restore branch");
      }
    } catch (error) {
      console.error("Error restoring branch:", error);
      toast.error(error.response?.data?.message || "Failed to restore branch");
    } finally {
      setRestoringId(null);
    }
  };

  const filtered = deletedBranches.filter((b) => {
    const q = search.toLowerCase();
    return (
      !q ||
      b.name?.toLowerCase().includes(q) ||
      b.code?.toLowerCase().includes(q) ||
      b.city?.toLowerCase().includes(q) ||
      b.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-rose-200">
              🗑️
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Recycle Bin: Branches
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Restore soft-deleted branches, their staff scopes, and task catalogs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadDeleted}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 shadow-sm transition disabled:opacity-50"
            >
              <span className={loading ? "animate-spin inline-block" : ""}>🔄</span>
              Refresh
            </button>
            <Link
              to="/admin/branches"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 shadow-sm transition"
            >
              ← Back to Branches
            </Link>
          </div>
        </div>

        {/* Info Badge */}
        {!loading && (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${filtered.length > 0 ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${filtered.length > 0 ? "bg-rose-500" : "bg-emerald-500"}`} />
              {filtered.length} {filtered.length === 1 ? "branch" : "branches"} in archive
            </span>
          </div>
        )}

        {/* Search */}
        <div className="relative bg-white rounded-2xl border border-slate-100 p-1 shadow-sm">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base select-none">
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search archived branches by name, code, city..."
            className="w-full bg-transparent border-0 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-0 transition"
          />
        </div>

        {/* Data List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white rounded-2xl border border-slate-200/60 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200 py-16 text-center shadow-sm"
          >
            <div className="text-6xl mb-4">♻️</div>
            <p className="text-slate-700 font-bold text-lg">No Branches in Recycle Bin</p>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              There are no deleted branch records matching your parameters.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((b) => (
                <motion.div
                  key={b._id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white hover:bg-slate-50/50 rounded-2xl border border-slate-200/60 shadow-sm hover:border-slate-300 transition gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-extrabold text-slate-800 text-base">{b.name}</h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                        {b.code}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>📍 Landmark: {b.location || "None"}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>🏙️ City: {b.city || "Lucknow"}</span>
                      {b.departments?.length > 0 && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-blue-600 font-semibold">📂 {b.departments.length} Departments</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestore(b._id, b.name)}
                    disabled={restoringId === b._id}
                    className="sm:self-center bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-emerald-250 transition flex items-center justify-center gap-1.5"
                  >
                    {restoringId === b._id ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Restoring…
                      </>
                    ) : (
                      <>🔄 Restore Branch</>
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrashBranches;
