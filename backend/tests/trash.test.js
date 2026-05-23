import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import dns from 'dns';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Branch from '../models/Branch.js';

// Setup DNS for resilient connection
dns.setServers(['1.1.1.1', '8.8.8.8']);
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

describe('🗑️ Permanent Hard Delete Trash Controller Tests', () => {
    let dbConnected = false;
    let adminUser, employeeUser;
    let adminToken, employeeToken;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/erp');
        }
        dbConnected = true;

        // Clean any leftovers from past test suites
        await User.deleteMany({ email: { $in: ['trash-admin@spis.in', 'trash-employee@spis.in', 'test-dep-user@spis.in'] } });
        await Branch.deleteMany({ name: { $in: ['Trash Test Branch', 'Empty Trash Branch'] } });
        await Task.deleteMany({ title: { $in: ['Soft Deleted Task', 'Active Task in Branch', 'Soft Deleted Task in Branch'] } });

        // Seed users
        adminUser = await User.create({
            name: 'Trash Admin',
            email: 'trash-admin@spis.in',
            password: 'TestPassword123!',
            role: 'admin',
            branch: 'Gaurabagh',
            department: 'Management',
            isActive: true,
            employeeId: 'TADM888'
        });

        employeeUser = await User.create({
            name: 'Trash Employee',
            email: 'trash-employee@spis.in',
            password: 'TestPassword123!',
            role: 'employee',
            branch: 'Gaurabagh',
            department: 'IT',
            isActive: true,
            employeeId: 'TEMP888'
        });

        adminToken = jwt.sign({ id: adminUser._id }, JWT_SECRET, { expiresIn: '1h' });
        employeeToken = jwt.sign({ id: employeeUser._id }, JWT_SECRET, { expiresIn: '1h' });
    });

    afterAll(async () => {
        if (dbConnected) {
            await User.deleteMany({ email: { $in: ['trash-admin@spis.in', 'trash-employee@spis.in', 'test-dep-user@spis.in'] } });
            await Branch.deleteMany({ name: { $in: ['Trash Test Branch', 'Empty Trash Branch'] } });
            await Task.deleteMany({ title: { $in: ['Soft Deleted Task', 'Active Task in Branch', 'Soft Deleted Task in Branch'] } });
        }
    });

    test('🔴 Should reject requests lacking token validation (401)', async () => {
        const dummyId = new mongoose.Types.ObjectId();
        const res = await request('http://localhost:5001')
            .delete(`/api/trash/task/${dummyId}`);
        
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    test('🔴 Should reject requests from non-admin accounts (403)', async () => {
        const dummyId = new mongoose.Types.ObjectId();
        const res = await request('http://localhost:5001')
            .delete(`/api/trash/task/${dummyId}`)
            .set('Authorization', `Bearer ${employeeToken}`);
        
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('is not authorized');
    });

    test('🔴 Should reject requests with invalid model type (400)', async () => {
        const dummyId = new mongoose.Types.ObjectId();
        const res = await request('http://localhost:5001')
            .delete(`/api/trash/invalid-type/${dummyId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Invalid type constraint');
    });

    test('🔴 Should reject deletion of non-existent documents (404)', async () => {
        const dummyId = new mongoose.Types.ObjectId();
        const res = await request('http://localhost:5001')
            .delete(`/api/trash/task/${dummyId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('not found in system databases');
    });

    test('🔴 Should reject deletion of active documents not in the Trash (403)', async () => {
        // Create an active task (isDeleted: false)
        const activeTask = await Task.create({
            title: 'Active Task in Branch',
            description: 'Not in trash',
            department: 'IT',
            branch: 'Gaurabagh',
            assignedBy: adminUser._id,
            dueDate: new Date(),
            isDeleted: false
        });

        const res = await request('http://localhost:5001')
            .delete(`/api/trash/task/${activeTask._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('is not natively flagged in the Trash');

        // Cleanup
        await Task.findByIdAndDelete(activeTask._id);
    });

    test('🔴 Should block permanent deletion of a branch if active users/tasks are mapped to it (400)', async () => {
        // Create a soft-deleted branch
        const testBranch = await Branch.create({
            name: 'Trash Test Branch',
            code: 'TTRB',
            isDeleted: true
        });

        // Create an active user mapped to this branch
        const dependentUser = await User.create({
            name: 'Test Dep User',
            email: 'test-dep-user@spis.in',
            password: 'TestPassword123!',
            role: 'employee',
            branch: 'Trash Test Branch',
            department: 'IT',
            isActive: true,
            employeeId: 'TDEP001'
        });

        // Attempt delete
        const res = await request('http://localhost:5001')
            .delete(`/api/trash/branch/${testBranch._id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Relational Cascade Blocked');

        // Cleanup user, then try to delete branch
        await User.findByIdAndDelete(dependentUser._id);
    });

    test('🟢 Should successfully hard delete a soft-deleted document (200)', async () => {
        // Create a soft-deleted task
        const softDeletedTask = await Task.create({
            title: 'Soft Deleted Task',
            description: 'In trash',
            department: 'IT',
            branch: 'Gaurabagh',
            assignedBy: adminUser._id,
            dueDate: new Date(),
            isDeleted: true
        });

        // Trigger hard delete
        const res = await request('http://localhost:5001')
            .delete(`/api/trash/task/${softDeletedTask._id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.purgedId).toBe(softDeletedTask._id.toString());
        expect(res.body.data.totalRowsPurged).toBe(1);

        // Verify task is completely gone from the DB
        const checkTask = await Task.findById(softDeletedTask._id);
        expect(checkTask).toBeNull();
    });
});
