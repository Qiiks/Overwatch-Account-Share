require('dotenv').config();  // Must be first to load env vars
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client directly for testing
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

// Create a JWT token for a real user
async function createRealUserToken() {
    console.log('\n=== Creating Token for Real User ===');
    
    try {
        // First, let's check if we have any users in the database
        const { data: users, error: fetchError } = await supabase
            .from('users')
            .select('id, email, username')
            .limit(1);
            
        if (fetchError) {
            console.error('Error fetching users:', fetchError);
            return null;
        }
        
        if (!users || users.length === 0) {
            console.log('No users found in database');
            console.log('Please register a user first through the frontend');
            return null;
        }
        
        const user = users[0];
        console.log('Found user:', { id: user.id, email: user.email, username: user.username });
        
        // Create a token for this real user
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                username: user.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        console.log('Token created successfully for real user');
        console.log('Token:', token);
        
        return { token, user };
    } catch (error) {
        console.error('Error creating token:', error);
        return null;
    }
}

// Test API endpoints with real authentication
async function testAuthEndpoints(token, user) {
    console.log('\n=== Testing API Endpoints with Real User ===');
    console.log(`User: ${user.email}`);
    const baseUrl = 'http://localhost:5001';
    
    const endpoints = [
        { method: 'GET', path: '/api/dashboard', name: 'Dashboard' },
        { method: 'GET', path: '/api/google-auth/accounts', name: 'Google Accounts' },
        { method: 'POST', path: '/api/google-auth/otp/init', name: 'Google OTP Init', body: { redirectUrl: '/dashboard' } }
    ];
    
    for (const endpoint of endpoints) {
        console.log(`\nTesting ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
        
        try {
            const options = {
                method: endpoint.method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };
            
            if (endpoint.body) {
                options.body = JSON.stringify(endpoint.body);
            }
            
            const response = await fetch(`${baseUrl}${endpoint.path}`, options);
            
            console.log(`  Status: ${response.status} ${response.statusText}`);
            
            if (response.status === 401) {
                const data = await response.json();
                console.log(`  401 Error:`, data);
            } else if (response.status === 404) {
                console.log(`  404 Error: Endpoint not found`);
            } else if (response.ok) {
                const data = await response.json();
                console.log(`  Success:`, JSON.stringify(data).substring(0, 200) + '...');
            } else {
                const text = await response.text();
                console.log(`  Response:`, text.substring(0, 200));
            }
        } catch (error) {
            console.error(`  Network Error:`, error.message);
        }
    }
}

// Test login endpoint to get a real token
async function testLogin() {
    console.log('\n=== Testing Login to Get Real Token ===');
    
    // You need to have a registered user for this to work
    // Update these credentials to match a real user in your database
    const testCredentials = {
        email: 'test@example.com',  // Update with real user email
        password: 'Test123!@#'       // Update with real user password
    };
    
    try {
        const response = await fetch('http://localhost:5001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testCredentials)
        });
        
        console.log(`Login Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Login successful!');
            console.log('Token received:', data.token ? 'Yes' : 'No');
            return data.token;
        } else {
            const error = await response.json();
            console.log('Login failed:', error);
            return null;
        }
    } catch (error) {
        console.error('Login error:', error.message);
        return null;
    }
}

// Main test runner
async function runTests() {
    console.log('=== Real Authentication Test ===');
    console.log('Server Port: 5001');
    console.log('API Base URL: http://localhost:5001');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    
    // Try to create a token for a real user
    const result = await createRealUserToken();
    
    if (result) {
        // Test endpoints with real user token
        await testAuthEndpoints(result.token, result.user);
    } else {
        console.log('\n=== Attempting Login Test ===');
        console.log('No users found in database. Trying login with test credentials...');
        const loginToken = await testLogin();
        
        if (loginToken) {
            // Decode the token to get user info
            const decoded = jwt.decode(loginToken);
            await testAuthEndpoints(loginToken, { email: decoded.email, id: decoded.id });
        } else {
            console.log('\nPlease register a user through the frontend first.');
        }
    }
    
    console.log('\n=== How to Fix Frontend ===');
    console.log('1. Make sure user is logged in');
    console.log('2. Token should be stored as "auth_token" in localStorage');
    console.log('3. All API calls should include: Authorization: Bearer <token>');
    console.log('4. Check browser console for actual token being sent');
    
    console.log('\n=== Test Complete ===');
    process.exit(0);
}

// Run tests
runTests().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});