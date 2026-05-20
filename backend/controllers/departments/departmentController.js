import Department from '../../models/Department.js';
import User from '../../models/User.js';
import Task from '../../models/Task.js';
import PendingRegistration from '../../models/PendingRegistration.js';
import Settings from '../../models/Settings.js';
import Employee from '../../models/Employee.js';
import Branch from '../../models/Branch.js';

// @desc    Get all departments
// @route   GET /api/departments
export const getDepartments = async (req, res) => {
    try {
        const departments = await Department.find({ isActive: true }).sort({ name: 1 });
        res.json({ success: true, data: departments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create department
// @route   POST /api/departments
export const createDepartment = async (req, res) => {
    try {
        const department = await Department.create(req.body);
        
        // Auto sync with Settings departments array
        const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
        if (settings && !settings.departments.includes(department.name)) {
            settings.departments.push(department.name);
            settings.markModified('departments');
            await settings.save();
        }

        res.status(201).json({ success: true, data: department });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update department
// @route   PUT /api/departments/:id
export const updateDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ success: false, message: 'Department not found' });
        }

        const oldName = department.name;
        const newName = req.body.name;

        // If department name is changing, check for duplicates and cascade references
        if (newName && newName !== oldName) {
            const dup = await Department.findOne({ name: newName, _id: { $ne: req.params.id } });
            if (dup) {
                return res.status(400).json({ success: false, message: 'A department with this name already exists' });
            }

            // Cascade update department references across collections
            await User.updateMany({ department: oldName }, { department: newName });
            await Task.updateMany({ department: oldName }, { department: newName });
            await PendingRegistration.updateMany({ department: oldName }, { department: newName });
            await Employee.updateMany({ department: oldName }, { department: newName });
            await Branch.updateMany(
                { departments: oldName },
                { $set: { "departments.$[elem]": newName } },
                { arrayFilters: [{ "elem": oldName }] }
            );

            // Sync with Settings singleton departments list and map
            const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
            if (settings) {
                const idx = settings.departments.indexOf(oldName);
                if (idx !== -1) {
                    settings.departments[idx] = newName;
                    settings.markModified('departments');
                }
                if (settings.departmentEmails && settings.departmentEmails.has(oldName)) {
                    const email = settings.departmentEmails.get(oldName);
                    settings.departmentEmails.set(newName, email);
                    settings.departmentEmails.delete(oldName);
                    settings.markModified('departmentEmails');
                }
                await settings.save();
            }
        }

        // Apply edits
        Object.assign(department, req.body);
        const updated = await department.save();

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
export const deleteDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ success: false, message: 'Department not found' });
        }

        const oldName = department.name;

        // SAFEGUARD: Check if the department is in use in any collection
        const usersCount = await User.countDocuments({ department: oldName });
        const tasksCount = await Task.countDocuments({ department: oldName });
        const pendingCount = await PendingRegistration.countDocuments({ department: oldName });
        const employeeCount = await Employee.countDocuments({ department: oldName });

        if (usersCount > 0 || tasksCount > 0 || pendingCount > 0 || employeeCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete department. It contains ${usersCount} users, ${tasksCount} tasks, ${pendingCount} pending registrations, and ${employeeCount} employee records. Please reassign them first.`
            });
        }

        // Pull department name from all branches
        await Branch.updateMany({}, { $pull: { departments: oldName } });

        // Pull department name from Settings
        const settings = await Settings.findOne({ singleton: 'SYSTEM_SETTINGS' });
        if (settings) {
            settings.departments = settings.departments.filter(d => d !== oldName);
            if (settings.departmentEmails) {
                settings.departmentEmails.delete(oldName);
            }
            settings.markModified('departments');
            settings.markModified('departmentEmails');
            await settings.save();
        }

        // Delete from collection
        await department.deleteOne();

        res.json({ success: true, message: 'Department deleted successfully (Cascade Settings Cleaned)' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};