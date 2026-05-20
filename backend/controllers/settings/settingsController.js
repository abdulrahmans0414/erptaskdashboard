import Settings from '../../models/Settings.js';
import Branch from '../../models/Branch.js';
import Department from '../../models/Department.js';

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
        const settings = await getOrCreateSettings();
        const settingsObj = settings.toObject();
        
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
        
        if (userCustomFields) settings.userCustomFields = userCustomFields;
        if (departmentEmails) settings.departmentEmails = departmentEmails;
        if (branchEmails) settings.branchEmails = branchEmails;
        if (emailConfig) {
            // Only update the password if a new one is provided (or if we explicitly want to clear it)
            // If the frontend sends '********' or '••••••••', it means password wasn't changed.
            if (emailConfig.pass === '********' || emailConfig.pass === '••••••••') {
                delete emailConfig.pass;
            }
            settings.emailConfig = { ...settings.emailConfig, ...emailConfig };
        }

        await settings.save();
        res.json({ success: true, data: settings, message: 'Settings updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
