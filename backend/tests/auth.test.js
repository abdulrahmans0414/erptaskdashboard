/**
 * backend/tests/auth.test.js
 * 
 * Integration tests for the Authentication & Security Audit.
 * Built using Jest and Supertest.
 * 
 * Verifies:
 *  1. Invalid phone format validation (on admin-creation)
 *  2. Initial inactive account state (on signup)
 *  3. Token Blacklisting (after logout)
 */

import request from 'supertest';

// Define the live URL of your running backend (falls back to localhost)
const BASE_URL = process.env.API_URL || 'http://localhost:5001';

describe('🔒 Section 1: Authentication & Security Audit E2E Tests', () => {
    
    // We will generate unique identifiers for each test run to avoid DB conflicts
    const timestamp = Date.now();
    const testEmployee = {
        name: `Test Employee ${timestamp}`,
        email: `emp_${timestamp}@spis.in`,
        password: 'Password123!',
        phone: '9876543210',
        role: 'employee',
        department: 'IT',
        branch: 'Gaurabagh',
        employeeId: `EMP${timestamp.toString().slice(-4)}`
    };

    let adminToken = '';
    
    beforeAll(async () => {
        // Log in as the default Admin to obtain a bearer token for admin-only endpoints
        const res = await request(BASE_URL)
            .post('/api/auth/login')
            .send({
                email: 'admin@spis.in',
                password: 'AdminPassword123!' // Using the seeded default admin credentials
            });
        
        if (res.body.success && res.body.data?.token) {
            adminToken = res.body.data.token;
        } else {
            console.warn('⚠️ Warning: Admin login failed. Seed database before running tests.');
        }
    });

    /* =========================================================================
     * TEST 1: Phone Format Validation (Indian 10-digit Standard)
     * ========================================================================= */
    describe('1. Phone Format Validation', () => {
        it('should reject registration if phone format is not exactly 10 digits', async () => {
            if (!adminToken) return; // skip if admin credentials aren't seeded

            const res = await request(BASE_URL)
                .post('/api/auth/register')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Test Reject',
                    email: `reject_${timestamp}@spis.in`,
                    password: 'Password123!',
                    role: 'employee',
                    branch: 'Gaurabagh',
                    department: 'IT',
                    phone: '999888' // Invalid: Only 6 digits
                });

            // Validation rules return 422 Unprocessable Entity
            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
            expect(res.body.errorCode).toBe('VALIDATION_FAILED');
            
            // Assert that the phone validation error message is present
            const phoneError = res.body.errors.find(err => err.field === 'phone');
            expect(phoneError).toBeDefined();
            expect(phoneError.message).toBe('Phone must be 10 digits');
        });
    });

    /* =========================================================================
     * TEST 2: Inactive State & 2-Step Approval Loop
     * ========================================================================= */
    describe('2. Inactive Registration Queue & Initial Account State', () => {
        it('should successfully submit self-signup request as pending/inactive', async () => {
            const res = await request(BASE_URL)
                .post('/api/auth/signup')
                .send(testEmployee);

            // Assert registration request is accepted
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('Registration request submitted successfully');
        });

        it('should strictly reject login attempts from an inactive/pending user', async () => {
            const res = await request(BASE_URL)
                .post('/api/auth/login')
                .send({
                    email: testEmployee.email,
                    password: testEmployee.password
                });

            // Should reject with 401 Unauthorized
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('pending admin approval');
        });
    });

    /* =========================================================================
     * TEST 3: Token Blacklisting Efficacy (Post-Logout Lockout)
     * ========================================================================= */
    describe('3. Token Blacklist post-logout verification', () => {
        let activeToken = '';

        beforeAll(async () => {
            // Log in as the admin to get a valid, active token
            const res = await request(BASE_URL)
                .post('/api/auth/login')
                .send({
                    email: 'admin@spis.in',
                    password: 'AdminPassword123!'
                });
            activeToken = res.body.data?.token;
        });

        it('should verify that a valid token can successfully query /api/auth/me', async () => {
            if (!activeToken) return;

            const res = await request(BASE_URL)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${activeToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.role).toBe('admin');
        });

        it('should successfully blacklist the token upon logging out', async () => {
            if (!activeToken) return;

            const res = await request(BASE_URL)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${activeToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('Logged out successfully');
        });

        it('should strictly reject subsequent API requests using the blacklisted token', async () => {
            if (!activeToken) return;

            const res = await request(BASE_URL)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${activeToken}`);

            // Supertest must assert a 401 Unauthorized status
            expect(res.status).toBe(401);
            expect(res.body.message).toContain('Token revoked');
        });
    });
});
