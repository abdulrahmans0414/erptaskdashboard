import React, { useState, useEffect } from "react";
import { useSettings } from "../../context/SettingsContext";
import api from "../../services/api";

import toast from "react-hot-toast";

/* ─── Array Manager (Departments / Branches) ─────────────────────── */
const ArrayManager = ({ title, icon, items, setItems, placeholder, accent = "blue" }) => {
  const [newItem, setNewItem] = useState("");
  const [error, setError] = useState("");

  const add = () => {
    const val = newItem.trim();
    if (!val) return;
    if (items.map(i => i.toLowerCase()).includes(val.toLowerCase())) { setError("Already exists"); return; }
    setItems([...items, val]);
    setNewItem("");
    setError("");
  };

  const handleRemove = (index, name) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove '${name}'?\n\nNote: This deletion is temporary and will only apply to the system after you click the 'Save Changes' button.`
    );
    if (confirmDelete) {
      setItems(items.filter((_, j) => j !== index));
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2"><span>{icon}</span> {title}</h3>
      <p className="text-xs text-gray-400 mb-4">{items.length} item{items.length !== 1 ? "s" : ""}</p>
      <div className="flex gap-2 mb-3">
        <input type="text"
          className={`flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition ${error ? "border-red-400" : "border-gray-200"}`}
          placeholder={placeholder} value={newItem}
          onChange={(e) => { setNewItem(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition">Add</button>
      </div>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <div className="flex flex-wrap gap-2 min-h-[36px]">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 group">
            <span className="text-sm font-medium text-gray-700">{item}</span>
            <button onClick={() => handleRemove(i, item)}
              className="text-gray-300 group-hover:text-rose-500 transition text-xs font-bold leading-none" title="Remove">✕</button>
          </div>
        ))}
        {items.length === 0 && <span className="text-sm text-gray-300 italic">No items yet</span>}
      </div>
    </div>
  );
};

/* ─── Custom Fields Manager ──────────────────────────────────────── */
const CustomFieldsManager = ({ customFields, setCustomFields, showToast }) => {
  const [newField, setNewField] = useState({ label: "", type: "text", required: false });
  const TYPE_LABELS = { text: "Text", number: "Number", date: "Date" };

  const addField = () => {
    if (!newField.label.trim()) return;
    const id = newField.label.toLowerCase().replace(/[^a-z0-9]/g, "_");
    if (customFields.find(f => f.id === id)) { showToast("Field already exists", "error"); return; }
    setCustomFields([...customFields, { ...newField, id }]);
    setNewField({ label: "", type: "text", required: false });
  };

  const handleRemove = (id, label) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the custom field '${label}'?\n\nNote: This deletion is temporary and will only apply to the system after you click 'Save Changes'.`
    );
    if (confirmDelete) {
      setCustomFields(customFields.filter(x => x.id !== id));
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
      <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2"><span>🧩</span> Employee Custom Fields</h3>
      <p className="text-xs text-gray-400 mb-5">Add extra data fields to all user profiles (e.g. Blood Group, Aadhaar No, Transport Route)</p>
      <div className="bg-blue-50 rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold mb-1 text-gray-600">Field Label *</label>
          <input type="text" placeholder="e.g. Blood Group" value={newField.label}
            onChange={(e) => setNewField({ ...newField, label: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && addField()}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="w-[140px]">
          <label className="block text-xs font-semibold mb-1 text-gray-600">Type</label>
          <select value={newField.type} onChange={(e) => setNewField({ ...newField, type: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 pb-2 cursor-pointer">
          <input type="checkbox" checked={newField.required}
            onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
            className="w-4 h-4 accent-blue-600 rounded" />
          Required
        </label>
        <button onClick={addField}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition">
          + Add Field
        </button>
      </div>
      <div className="space-y-2">
        {customFields.map((f) => (
          <div key={f.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-lg">🏷️</span>
              <div>
                <p className="font-semibold text-sm text-gray-800">{f.label}</p>
                <p className="text-xs text-gray-400">Type: {TYPE_LABELS[f.type] || f.type} · ID: <span className="font-mono">{f.id}</span></p>
              </div>
              {f.required && <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold uppercase">Required</span>}
            </div>
            <button onClick={() => handleRemove(f.id, f.label)}
              className="text-sm text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition font-medium">Delete</button>
          </div>
        ))}
        {customFields.length === 0 && (
          <div className="text-center py-8 text-gray-300"><p className="text-3xl mb-2">🧩</p><p className="text-sm">No custom fields defined yet.</p></div>
        )}
      </div>
    </div>
  );
};

/* ─── Email Config Panel ─────────────────────────────────────────── */
const EmailConfigPanel = ({ showToast }) => {
  const [config, setConfig] = useState({ host: "", port: 587, user: "", pass: "", fromEmail: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [showTestBox, setShowTestBox] = useState(false);
  const MASKED = "••••••••";

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/settings");
        if (res.data.success && res.data.data?.emailConfig) {
          const ec = res.data.data.emailConfig;
          setConfig({ host: ec.host || "", port: ec.port || 587, user: ec.user || "", pass: ec.pass ? MASKED : "", fromEmail: ec.fromEmail || "" });
        }
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put("/settings", { emailConfig: { ...config, pass: config.pass === MASKED ? MASKED : config.pass } });
      if (res.data.success) {
        showToast("Email configuration saved!");
        if (config.pass && config.pass !== MASKED) setConfig(prev => ({ ...prev, pass: MASKED }));
      } else showToast(res.data.message || "Failed to save", "error");
    } catch (err) { showToast(err?.response?.data?.message || "Save failed", "error"); }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!testEmail.trim()) return;
    setTesting(true);
    try {
      const res = await api.post("/settings/test-email", { email: testEmail });
      if (res.data.success) showToast(`Test email sent to ${testEmail}`);
      else showToast(res.data.message || "Test failed", "error");
    } catch (err) { showToast(err?.response?.data?.message || "Test failed – check SMTP credentials", "error"); }
    setTesting(false);
  };

  if (loading) return <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 animate-pulse"><div className="h-32 bg-gray-100 rounded-xl" /></div>;

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><span>📧</span> Email / SMTP Configuration</h3>
          <p className="text-xs text-gray-400 mt-0.5">Configure outgoing email for OTP verification and task notifications</p>
        </div>
        <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-2 py-1 rounded-full border border-orange-200">Admin Only</span>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-xs text-blue-700">
        <strong>💡 Gmail Setup:</strong> Enable 2-Step Verification → Go to myaccount.google.com/apppasswords → Generate App Password → Use it here.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">SMTP Host</label>
          <input type="text" placeholder="smtp.gmail.com" value={config.host}
            onChange={(e) => setConfig({ ...config, host: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">SMTP Port</label>
          <input type="number" placeholder="587" value={config.port}
            onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address (Sender)</label>
          <input type="email" placeholder="your-email@gmail.com" value={config.user}
            onChange={(e) => setConfig({ ...config, user: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">App Password</label>
          <div className="relative">
            <input type={showPass ? "text" : "password"} placeholder="16-character App Password" value={config.pass}
              onChange={(e) => setConfig({ ...config, pass: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            <button type="button" onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Display Name / From Email (optional)</label>
          <input type="text" placeholder="SPIS Task Controller <noreply@yourschool.com>" value={config.fromEmail}
            onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-5">
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-blue-200/70">
          {saving ? "Saving..." : "💾 Save Email Config"}
        </button>
        <button onClick={() => setShowTestBox(s => !s)}
          className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition">
          {showTestBox ? "Hide Test" : "🔬 Test Connection"}
        </button>
      </div>

      {showTestBox && (
        <div className="mt-4 flex gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <input type="email" placeholder="Send test email to..." value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button onClick={handleTest} disabled={testing || !testEmail.trim()}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition">
            {testing ? "Sending..." : "Send Test"}
          </button>
        </div>
      )}
    </div>
  );
};

/* ─── Email Routing Panel (CC Config) ───────────────────────────── */
const EmailRoutingPanel = ({ departments, branches, settings, updateSettings, showToast }) => {
  const [deptEmails, setDeptEmails] = useState({});
  const [branchEmails, setBranchEmails] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setDeptEmails(settings.departmentEmails || {});
      setBranchEmails(settings.branchEmails || {});
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ departmentEmails: deptEmails, branchEmails });
      showToast("Email routing saved successfully!");
    } catch (err) {
      const errMsg = err?.response?.data?.message || "Failed to save email routing";
      showToast(errMsg, "error");
    }
    setSaving(false);
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><span>🔄</span> Automated Email Routing (CC)</h3>
          <p className="text-xs text-gray-400 mt-0.5">Automatically CC a specific email address when a task is submitted in a department or branch.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-blue-200/70">
          {saving ? "Saving..." : "💾 Save Routing"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Department Emails */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">🏢 Department Routing</h4>
          <div className="space-y-3">
            {departments.length === 0 ? <p className="text-xs text-gray-400 italic">No departments configured.</p> : null}
            {departments.map(dept => (
              <div key={dept} className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">{dept} Email</label>
                <input type="email" placeholder={`e.g. ${dept.toLowerCase().replace(/\s/g, '')}@spis.in`}
                  value={deptEmails[dept] || ""}
                  onChange={(e) => setDeptEmails({ ...deptEmails, [dept]: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Branch Emails */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">📍 Branch Routing</h4>
          <div className="space-y-3">
            {branches.length === 0 ? <p className="text-xs text-gray-400 italic">No branches configured.</p> : null}
            {branches.map(branch => (
              <div key={branch} className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">{branch} Email</label>
                <input type="email" placeholder={`e.g. ${branch.toLowerCase().replace(/\s/g, '')}@spis.in`}
                  value={branchEmails[branch] || ""}
                  onChange={(e) => setBranchEmails({ ...branchEmails, [branch]: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────── */
const TABS = [
  { id: "org", label: "Organization", icon: "🏢" },
  { id: "fields", label: "Custom Fields", icon: "🧩" },
  { id: "email", label: "SMTP Config", icon: "📧" },
  { id: "routing", label: "Email Routing", icon: "🔄" },
];

const SystemSettings = () => {
  const { settings, loading, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState("org");
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const showToast = (msg, type = "success") => {
    if (type === "success") toast.success(msg);
    else toast.error(msg);
  };

  useEffect(() => {
    if (settings) {
      setDepartments(settings.departments || []);
      setBranches(settings.branches || []);
      setCustomFields(settings.userCustomFields || []);
    }
  }, [settings]);

  const isDirty = settings ? (
    JSON.stringify(departments) !== JSON.stringify(settings.departments || []) ||
    JSON.stringify(branches) !== JSON.stringify(settings.branches || []) ||
    JSON.stringify(customFields) !== JSON.stringify(settings.userCustomFields || [])
  ) : false;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ departments, branches, userCustomFields: customFields });
      showToast("Settings saved successfully!");
    } catch (err) { 
      const errMsg = err?.response?.data?.message || "Failed to save settings";
      showToast(errMsg, "error"); 
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="p-8 text-center">
      <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
      <p className="text-gray-400 text-sm">Loading settings...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-fadeIn">

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl shadow-md shadow-blue-200">⚙️</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
            <p className="text-gray-500 text-sm">Organization structure, custom fields, and integrations</p>
          </div>
        </div>
        {(activeTab === "org" || activeTab === "fields") && (
          <button onClick={handleSave} disabled={saving}
            className={`flex-shrink-0 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 disabled:opacity-50 shadow-md ${
              isDirty 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white animate-pulse ring-2 ring-blue-400 ring-offset-2 shadow-blue-200" 
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200/70"
            }`}>
            {saving ? "Saving..." : "💾 Save Changes"}
          </button>
        )}
      </div>

      {/* Unsaved changes warning bar */}
      {isDirty && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-5 py-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse shadow-sm shadow-amber-100/50">
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            <span className="text-lg">⚠️</span>
            <span>You have unsaved changes! Please click 'Save Changes' to permanently apply updates.</span>
          </div>
          <button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm self-start sm:self-auto">
            {saving ? "Saving..." : "Save Now"}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl p-1.5 shadow-sm border border-gray-100 flex gap-1 overflow-x-auto whitespace-nowrap" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.id ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
            }`}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeTab === "org" && (
          <>
            <ArrayManager title="Departments" icon="🏢" items={departments} setItems={setDepartments} placeholder="e.g. Admissions" />
            <ArrayManager title="Branches / Campuses" icon="📍" items={branches} setItems={setBranches} placeholder="e.g. City Campus" />
          </>
        )}
        {activeTab === "fields" && (
          <CustomFieldsManager customFields={customFields} setCustomFields={setCustomFields} showToast={showToast} />
        )}
        {activeTab === "email" && (
          <EmailConfigPanel showToast={showToast} />
        )}
        {activeTab === "routing" && (
          <EmailRoutingPanel departments={departments} branches={branches} settings={settings} updateSettings={updateSettings} showToast={showToast} />
        )}
      </div>
    </div>
  );
};

export default SystemSettings;

