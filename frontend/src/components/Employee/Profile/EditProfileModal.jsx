import React from 'react';
import { useSettings } from '../../../context/SettingsContext';

const EditProfileModal = ({
    showEditModal,
    setShowEditModal,
    editForm,
    setEditForm,
    handleEditSubmit,
    editLoading,
    isAdmin = false // Added isAdmin prop for field protection
}) => {
    const { settings } = useSettings();

    if (!showEditModal) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
                <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex justify-between items-center rounded-t-2xl z-10">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm">
                            ✏️
                        </span>
                        Edit Profile
                    </h3>
                    <button
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 text-xl flex items-center justify-center transition"
                    >
                        ×
                    </button>
                </div>
                <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { label: "Full Name", key: "name", type: "text", required: true },
                            { label: "Email Address", key: "email", type: "email", required: true },
                            { label: "Phone Number", key: "phone", type: "text" },
                            { label: "Blood Group", key: "bloodGroup", type: "text" },
                        ].map((f) => (
                            <div key={f.key}>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    {f.label} {f.required && <span className="text-rose-500">*</span>}
                                </label>
                                <input
                                    type={f.type}
                                    required={f.required}
                                    value={editForm[f.key] || ""}
                                    onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                                />
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Home Address
                        </label>
                        <textarea
                            value={editForm.address || ""}
                            onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                            rows="2"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { label: "Department", key: "department", options: settings?.departments || [], protected: true },
                            { label: "Branch", key: "branch", options: settings?.branches || [], protected: true },
                            { label: "Role", key: "role", options: ['admin', 'department-head', 'branch-head', 'hr', 'it', 'graphic', 'employee'], protected: true },
                            { label: "Date of Joining", key: "dateOfJoining", type: "date", protected: true },
                        ].map((f) => (
                            <div key={f.key}>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    {f.label} {f.protected && !isAdmin && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-1">Read-only</span>}
                                </label>
                                {f.options ? (
                                    <select
                                        disabled={f.protected && !isAdmin}
                                        value={editForm[f.key] || ""}
                                        onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition capitalize disabled:bg-slate-50 disabled:text-slate-500"
                                    >
                                        <option value="" disabled>Select {f.label}</option>
                                        {f.options.map((o) => (
                                            <option key={o} value={o}>{o}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={f.type || "text"}
                                        disabled={f.protected && !isAdmin}
                                        value={editForm[f.key] ? editForm[f.key].split('T')[0] : ""}
                                        onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Update Password <span className="text-[10px] text-slate-400 font-normal">(Leave blank to keep current)</span>
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={editForm.password || ""}
                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                        />
                    </div>

                    {/* Dynamic Custom Fields */}
                    {settings?.userCustomFields?.length > 0 && (
                        <div className="pt-4 border-t border-slate-100 space-y-4">
                            <h4 className="text-sm font-bold text-slate-800">Additional Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {settings.userCustomFields.map(field => (
                                    <div key={field.id}>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                                        </label>
                                        <input
                                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                            required={field.required}
                                            value={editForm?.customFields?.[field.id] || ""}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                customFields: {
                                                    ...(editForm.customFields || {}),
                                                    [field.id]: e.target.value
                                                }
                                            })}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setShowEditModal(false)}
                            className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={editLoading}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:shadow-lg disabled:opacity-50 transition"
                        >
                            {editLoading ? "Saving..." : "💾 Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;

