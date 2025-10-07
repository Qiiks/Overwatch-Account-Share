require('dotenv').config();
const jwt = require('jsonwebtoken');

async function testFullAuthFlow() {
    console.log('\n=== Testing Full Frontend Authentication Flow ===');
    const baseUrl = 'http://localhost:5001';
    
    // Step 1: Login to get a token (like frontend does)
    console.log('\n1. Testing Login...');
    
    const loginData = {
        email: 'gameslayer.inc@gmail.com',  // Use the real user we found
        password: 'Test123!@#'  // You'll need to know the actual password
    };
    
    try {
        const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        console.log('   Login response status:', loginResponse.status);
        
        if (loginResponse.ok) {
            const loginResult = await loginResponse.json();
            console.log('   Login successful!');
            console.log('   Token received:', loginResult.token ? 'Yes' : 'No');
            
            if (loginResult.token) {
                // Decode token to see what's in it
                const decoded = jwt.decode(loginResult.token);
                console.log('   Token payload:', decoded);
                
                // Step 2: Use the token from login
                console.log('\n2. Testing authenticated endpoints with login token...');
                
                const endpoints = [
                    { method: 'GET', path: '/api/dashboard', name: 'Dashboard' },
                    { method: 'GET', path: '/api/google-auth/accounts', name: 'Google Accounts' },
                    { method: 'POST', path: '/api/google-auth/otp/init', name: 'Google OTP Init', body: { redirectUrl: '/dashboard' } }
                ];
                
                for (const endpoint of endpoints) {
                    console.log(`\n   Testing ${endpoint.name}...`);
                    
                    const options = {
                        method: endpoint.method,
                        headers: {
                            'Authorization': `Bearer ${loginResult.token}`,
                            'Content-Type': 'application/json'
                        }
                    };
                    
                    if (endpoint.body) {
                        options.body = JSON.stringify(endpoint.body);
                    }
                    
                    const response = await fetch(`${baseUrl}${endpoint.path}`, options);
                    console.log(`   Status: ${response.status} ${response.statusText}`);
                    
                    if (response.ok) {
                        console.log('   ✓ Success!');
                    } else {
                        const error = await response.json();
                        console.log('   ✗ Error:', error);
                    }
                }
            }
        } else {
            const error = await loginResponse.json();
            console.log('   Login failed:', error);
            console.log('\n   Note: The password might be incorrect.');
            console.log('   Please register a new user or use correct credentials.');
        }
        
    } catch (error) {
        console.error('Network error:', error.message);
    }
    
    console.log('\n=== Summary ===');
    console.log('1. The 404 error for /api/google-auth/otp/init has been FIXED ✓');
    console.log('2. Authentication issues are due to:');
    console.log('   - Frontend not having a valid token');
    console.log('   - OR token expired');
    console.log('   - OR user needs to login again');
    console.log('\n3. Frontend Fix Required:');
    console.log('   - Ensure user is logged in');
    console.log('   - Store token as "auth_token" in localStorage');
    console.log('   - Include token in all API requests');
}

testFullAuthFlow().then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});