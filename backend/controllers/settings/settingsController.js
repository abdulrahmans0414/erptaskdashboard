import Settings from '../../models/Settings.js';
import Branch from '../../models/Branch.js';
import Department from '../../models/Department.js';
import User from '../../models/User.js';
import Task from '../../models/Task.js';
import { createAuditLog } from '../../utils/auditLogger.js';
import { getCache, setCache, flushCachePattern } from '../../utils/cacheService.js';

const getOrCreateSettings = async () => {
    let settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
    if (!settings) {
        settings = await Settings.create({});
    }
    return settings;
};

// @desc    Get system settings
// @route   GET /api/settings
// @access  Public (or Private depending on needs, usually everyone needs to read them)
export const getSettings = async (req, res) => {
    try {
        const cacheKey = 'settings:singleton';
        
        // Cache logic
        // Only return from cache if the user is not an admin, because admins might need the real object to see if pass is set
        // Actually, password is removed for non-admins, so we should cache the non-admin version, or we can just cache the raw object and strip it for non-admins
        let settingsObj = await getCache(cacheKey);
        
        if (!settingsObj) {
            const settings = await getOrCreateSettings();
            settingsObj = settings.toObject();
            await setCache(cacheKey, settingsObj, 3600); // 1 hour
        }
        
        // Hide email config password from frontend for security
        // Only Admins can see the password when they load settings
        if (!req.user || req.user.role !== 'admin') {
             if (settingsObj.emailConfig) {
                 delete settingsObj.emailConfig;
             }
         }

        res.json({ success: true, data: settingsObj });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update system settings (Departments, Branches, Custom Fields, Email Routing)
// @route   PUT /api/settings
// @access  Admin
export const updateSettings = async (req, res) => {
    try {
        const { departments, branches, userCustomFields, emailConfig, departmentEmails, branchEmails } = req.body;
        const settings = await getOrCreateSettings();

        if (departments) {
            // Validate deleted departments against existing database users/tasks
            const removedDepts = (settings.departments || []).filter(d => !departments.includes(d));
            if (removedDepts.length > 0) {
                const activeRemoved = [];
                for (const dept of removedDepts) {
                    const u = await User.countDocuments({ department: dept });
                    const t = await Task.countDocuments({ department: dept });
                    if (u > 0 || t > 0) {
                        activeRemoved.push(`'${dept}' (${u} employee${u !== 1 ? 's' : ''}, ${t} task${t !== 1 ? 's' : ''})`);
                    }
                }
                if (activeRemoved.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Cannot delete department(s) because they are in active use: ${activeRemoved.join(', ')}. Please reassign them first.`
                    });
                }
            }

            settings.departments = departments;
            // Sync missing departments to Department collection
            for (const dName of departments) {
                const trimmed = dName.trim();
                if (!trimmed) continue;
                const exists = await Department.findOne({ name: trimmed });
                if (!exists) {
                    await Department.create({
                        name: trimmed,
                        code: trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || ('DEP' + Math.floor(10 + Math.random() * 89)),
                        isActive: true
                    });
                }
            }
        }
        
        if (branches) {
            // Validate deleted branches against existing database users/tasks
            const removedBranches = (settings.branches || []).filter(b => !branches.includes(b));
            if (removedBranches.length > 0) {
                const activeRemoved = [];
                for (const br of removedBranches) {
                    const u = await User.countDocuments({ branch: br });
                    const t = await Task.countDocuments({ branch: br });
                    if (u > 0 || t > 0) {
                        activeRemoved.push(`'${br}' (${u} employee${u !== 1 ? 's' : ''}, ${t} task${t !== 1 ? 's' : ''})`);
                    }
                }
                if (activeRemoved.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Cannot delete branch(es) because they are in active use: ${activeRemoved.join(', ')}. Please reassign them first.`
                    });
                }
            }

            settings.branches = branches;
            // Sync missing branches to Branch collection
            for (const bName of branches) {
                const trimmed = bName.trim();
                if (!trimmed) continue;
                const exists = await Branch.findOne({ name: trimmed });
                if (!exists) {
                    await Branch.create({
                        name: trimmed,
                        code: trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || ('BR' + Math.floor(10 + Math.random() * 89)),
                        isActive: true
                    });
                }
            }
        }
        
        const oldSettings = settings.toObject();

        if (userCustomFields) settings.userCustomFields = userCustomFields;
        if (departmentEmails) settings.departmentEmails = departmentEmails;
        if (branchEmails) settings.branchEmails = branchEmails;
        if (emailConfig) {
            // Only update the password if a new one is provided (or if we explicitly want to clear it)
            // If the frontend sends '********' or '••••••••', it means password wasn't changed.
            const updatedConfig = { ...emailConfig };
            if (updatedConfig.pass === '********' || updatedConfig.pass === '••••••••') {
                delete updatedConfig.pass;
            }
            
            // Merge fields safely without losing existing values like the password
            settings.emailConfig = {
                host: updatedConfig.host !== undefined ? updatedConfig.host : settings.emailConfig.host,
                port: updatedConfig.port !== undefined ? updatedConfig.port : settings.emailConfig.port,
                user: updatedConfig.user !== undefined ? updatedConfig.user : settings.emailConfig.user,
                pass: updatedConfig.pass !== undefined ? updatedConfig.pass : settings.emailConfig.pass,
                fromEmail: updatedConfig.fromEmail !== undefined ? updatedConfig.fromEmail : settings.emailConfig.fromEmail
            };
        }

        await settings.save();
        
        await flushCachePattern('settings:*');

        res.json({ success: true, data: settings, message: 'Settings updated successfully' });

        // Log Audit
        const { emailConfig: _1, ...safeOldSettings } = oldSettings;
        const { emailConfig: _2, ...safeNewSettings } = settings.toObject();
        await createAuditLog(req, 'UPDATE', 'SETTINGS', settings._id, safeOldSettings, safeNewSettings);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
