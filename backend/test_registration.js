import http from 'http';

const BASE_URL = 'http://localhost:5001';

// Helper function to make HTTP requests
const request = (method, path, body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

async function runTest() {
    console.log('🤖 Starting Registration & OTP Verification Flow Test...');

    // 1. SIGNUP REQUEST
    const signupPayload = {
        name: 'Abdul Rahman',
        email: 'abdulrahmans0414@gmail.com',
        password: 'employee123',
        phone: '9876543210',
        employeeId: 'abdulrahmans0414',
        department: 'IT',
        branch: 'Gaurabagh',
        role: 'employee',
        designation: 'Senior Developer'
    };

    console.log('\nStep 1: Submitting Self-Registration Request for Abdul Rahman...');
    const signupRes = await request('POST', '/api/auth/signup', signupPayload);
    console.log(`Response Status: ${signupRes.status}`);
    console.log('Response Body:', signupRes.body);

    if (signupRes.status !== 201 && !signupRes.body?.message?.includes('already pending')) {
        console.error('❌ Signup failed!');
        return;
    }

    // 2. ADMIN LOGIN TO RETRIEVE TOKEN
    console.log('\nStep 2: Logging in as Admin...');
    const loginPayload = {
        email: 'admin@example.com',
        password: 'admin123'
    };
    const loginRes = await request('POST', '/api/auth/login', loginPayload);
    console.log(`Response Status: ${loginRes.status}`);
    
    if (loginRes.status !== 200) {
        console.error('❌ Admin login failed!');
        return;
    }

    const token = loginRes.body?.data?.token;
    const adminHeaders = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Admin authenticated successfully!');

    // 3. RETRIEVE PENDING REGISTRATIONS
    console.log('\nStep 3: Fetching pending registrations from Admin Panel...');
    const pendingRes = await request('GET', '/api/auth/pending-registrations?status=pending', null, adminHeaders);
    console.log(`Response Status: ${pendingRes.status}`);
    
    if (pendingRes.status !== 200) {
        console.error('❌ Failed to retrieve pending list!');
        return;
    }

    const pendingList = pendingRes.body?.data || [];
    const myRequest = pendingList.find(p => p.email === 'abdulrahmans0414@gmail.com');

    if (!myRequest) {
        console.error('❌ Abdul Rahman\'s registration request not found in pending list! Checking if it was already processed...');
        // Let's fetch all registrations just in case
        const allRes = await request('GET', '/api/auth/pending-registrations?status=all', null, adminHeaders);
        const alreadyActive = allRes.body?.data?.find(p => p.email === 'abdulrahmans0414@gmail.com');
        if (alreadyActive) {
            console.log(`ℹ️ Request already exists with status: "${alreadyActive.status}".`);
            if (alreadyActive.status === 'otp_sent') {
                console.log('➡️ Status is "otp_sent". OTP email has already been triggered! You can check your email inbox.');
            }
            return;
        }
        return;
    }

    const requestId = myRequest._id;
    console.log(`✅ Found pending registration request ID: ${requestId}`);

    // 4. ADMIN APPROVES & TRIGGERS OTP EMAIL VIA SMTP
    console.log('\nStep 4: Admin reviewing and sending OTP email to abdulrahmans0414@gmail.com...');
    const reviewPayload = {
        action: 'send_otp',
        adminNote: 'Verified real email address. Triggering real OTP.'
    };
    
    const reviewRes = await request('PUT', `/api/auth/pending-registrations/${requestId}/review`, reviewPayload, adminHeaders);
    console.log(`Response Status: ${reviewRes.status}`);
    console.log('Response Body:', reviewRes.body);

    if (reviewRes.status === 200) {
        console.log('\n🎉 SUCCESS! The SMTP server has successfully sent a real registration OTP directly to your email: abdulrahmans0414@gmail.com!');
        console.log('Please check your Gmail inbox (and your spam folder just in case) for the OTP email from "iamarsiddiqui@gmail.com".');
    } else {
        console.error('❌ Failed to trigger review action!');
    }
}

runTest().catch(console.error);
