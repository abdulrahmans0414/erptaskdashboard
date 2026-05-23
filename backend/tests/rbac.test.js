/**
 * backend/tests/rbac.test.js
 * 
 * E2E Integration Test Suite for Section 2: Multi-Tenant & Role-Based Access Control (RBAC) Tests.
 * Built using Jest, Supertest, and Mongoose.
 * 
 * Verifies that the buildTaskFilter middleware successfully isolates data
 * at the query layer for different user roles (Employee vs Department Head).
 */

import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import dns from 'dns';
import User from '../models/User.js';
import Task from '../models/Task.js';

// ✅ DNS Configuration - Fix for MongoDB Atlas SRV lookup
dns.setServers(['1.1.1.1', '8.8.8.8']);
dotenv.config();

const BASE_URL = process.env.API_URL || 'http://localhost:5001';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

describe('🔑 Section 2: Multi-Tenant & Role-Based Access Control (RBAC) Tests', () => {
    
    let dbConnected = false;
    let employeeUser, deptHeadUser, adminUser;
    let employeeToken, deptHeadToken, adminToken;
    let taskEmployee, taskDeptHead, taskOther;

    beforeAll(async () => {
        // 1. Establish direct database connection for seeding & cleanup
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/erp');
        }
        dbConnected = true;

        // 2. RESILIENT SANDBOX CLEANUP: Purge stale test entries from any previous crashed runs
        // We delete by specific test emails AND by the unique IT Gaurabagh dept head combo to avoid duplicate keys.
        await User.deleteMany({
            $or: [
                { email: { $in: ['admin-test@spis.in', 'depthead-test@spis.in', 'employee-test@spis.in'] } },
                { branch: 'Gaurabagh', department: 'IT', role: 'department-head' }
            ]
        });

        await Task.deleteMany({
            title: {
                $in: [
                    'Employee Personal Task Test',
                    'IT Gaurabagh Dept Task Test',
                    'HR Hive Dept Task Test'
                ]
            }
        });

        // 3. Dynamically seed Clean Test Users with mandatory validation rules and static sandbox emails
        adminUser = await User.create({
            name: 'Test Admin Sandbox',
            email: 'admin-test@spis.in',
            password: 'TestPassword123!',
            role: 'admin',
            branch: 'Gaurabagh',
            department: 'Management',
            isActive: true,
            employeeId: 'TADM999'
        });

        deptHeadUser = await User.create({
            name: 'Test Dept Head Sandbox',
            email: 'depthead-test@spis.in',
            password: 'TestPassword123!',
            role: 'department-head',
            branch: 'Gaurabagh',
            department: 'IT',
            isActive: true,
            employeeId: 'TDHD999'
        });

        employeeUser = await User.create({
            name: 'Test Employee Sandbox',
            email: 'employee-test@spis.in',
            password: 'TestPassword123!',
            role: 'employee',
            branch: 'Gaurabagh',
            department: 'IT',
            isActive: true,
            employeeId: 'TEMP999'
        });

        // 4. Generate JWT Tokens Programmatically for clean API isolation
        adminToken = jwt.sign({ id: adminUser._id }, JWT_SECRET, { expiresIn: '1h' });
        deptHeadToken = jwt.sign({ id: deptHeadUser._id }, JWT_SECRET, { expiresIn: '1h' });
        employeeToken = jwt.sign({ id: employeeUser._id }, JWT_SECRET, { expiresIn: '1h' });

        // 5. Dynamically seed 3 target dummy tasks with specific attributes
        // Task A: Assigned directly to Employee
        taskEmployee = await Task.create({
            title: 'Employee Personal Task Test',
            description: 'Assigned strictly to employeeUser',
            department: 'IT',
            branch: 'Gaurabagh',
            assignedBy: adminUser._id,
            assignedTo: employeeUser._id,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        // Task B: Gaurabagh + IT (unassigned, belongs to dept)
        taskDeptHead = await Task.create({
            title: 'IT Gaurabagh Dept Task Test',
            description: 'Belongs to Gaurabagh IT branch, but NOT assigned to employeeUser',
            department: 'IT',
            branch: 'Gaurabagh',
            assignedBy: adminUser._id,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        // Task C: HR + Hive (completely separate branch and department context)
        taskOther = await Task.create({
            title: 'HR Hive Dept Task Test',
            description: 'Belongs to Hive HR branch and department',
            department: 'HR',
            branch: 'Hive',
            assignedBy: adminUser._id,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
    });

    afterAll(async () => {
        // 1. Purge seeded test data with high-resiliency checks to prevent property-of-undefined crashes
        if (dbConnected) {
            const userIds = [];
            if (adminUser?._id) userIds.push(adminUser._id);
            if (deptHeadUser?._id) userIds.push(deptHeadUser._id);
            if (employeeUser?._id) userIds.push(employeeUser._id);
            
            if (userIds.length > 0) {
                await User.deleteMany({ _id: { $in: userIds } });
            }

            const taskIds = [];
            if (taskEmployee?._id) taskIds.push(taskEmployee._id);
            if (taskDeptHead?._id) taskIds.push(taskDeptHead._id);
            if (taskOther?._id) taskIds.push(taskOther._id);

            if (taskIds.length > 0) {
                await Task.deleteMany({ _id: { $in: taskIds } });
            }
            
            // Close active Mongoose connection gracefully
            await mongoose.connection.close();
        }
    });

    /* =========================================================================
     * TEST SUITE: Data Isolation Verification
     * ========================================================================= */
    describe('🛡️ Role-Based Task Scoping Checks', () => {

        it('should strictly limit Employee to their personally assigned tasks', async () => {
            const res = await request(BASE_URL)
                .get('/api/tasks')
                .set('Authorization', `Bearer ${employeeToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const tasks = res.body.data;
            expect(tasks).toBeDefined();
            expect(Array.isArray(tasks)).toBe(true);

            // Assert that the employee's personal task is in the list
            const hasPersonalTask = tasks.some(t => t._id.toString() === taskEmployee._id.toString());
            expect(hasPersonalTask).toBe(true);

            // Assert that the department task (unassigned) and foreign branch tasks are strictly excluded
            const hasDeptTask = tasks.some(t => t._id.toString() === taskDeptHead._id.toString());
            const hasOtherTask = tasks.some(t => t._id.toString() === taskOther._id.toString());
            expect(hasDeptTask).toBe(false);
            expect(hasOtherTask).toBe(false);
        });

        it('should allow Department Head to see all tasks within their Department + Branch combo, but block other branches', async () => {
            const res = await request(BASE_URL)
                .get('/api/tasks')
                .set('Authorization', `Bearer ${deptHeadToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const tasks = res.body.data;
            expect(tasks).toBeDefined();

            // Assert they can see both Gaurabagh IT tasks (the employee-assigned one and the generic one)
            const hasPersonalTask = tasks.some(t => t._id.toString() === taskEmployee._id.toString());
            const hasDeptTask = tasks.some(t => t._id.toString() === taskDeptHead._id.toString());
            expect(hasPersonalTask).toBe(true);
            expect(hasDeptTask).toBe(true);

            // Assert they CANNOT see the Hive HR task under any circumstances
            const hasOtherTask = tasks.some(t => t._id.toString() === taskOther._id.toString());
            expect(hasOtherTask).toBe(false);
        });

        it('should allow Global Admin to see all tasks including other departments and branches', async () => {
            const res = await request(BASE_URL)
                .get('/api/tasks')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const tasks = res.body.data;
            expect(tasks).toBeDefined();

            // Assert admin sees all 3 seeded tasks perfectly
            const hasPersonalTask = tasks.some(t => t._id.toString() === taskEmployee._id.toString());
            const hasDeptTask = tasks.some(t => t._id.toString() === taskDeptHead._id.toString());
            const hasOtherTask = tasks.some(t => t._id.toString() === taskOther._id.toString());

            expect(hasPersonalTask).toBe(true);
            expect(hasDeptTask).toBe(true);
            expect(hasOtherTask).toBe(true);
        });
    });
});
