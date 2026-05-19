import Settings from '../../models/Settings.js';

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

        if (departments) settings.departments = departments;
        if (branches) settings.branches = branches;
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
