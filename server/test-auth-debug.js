const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test JWT token creation and verification
function testJWT() {
    console.log('\n=== JWT Test ===');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
    
    // Create a test token
    const testPayload = {
        id: 'test-user-id-123',
        email: 'test@example.com',
        username: 'testuser'
    };
    
    try {
        const token = jwt.sign(testPayload, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });
        console.log('Test token created successfully');
        console.log('Token:', token);
        
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token verified successfully');
        console.log('Decoded payload:', decoded);
        
        // Test with Bearer format
        const bearerToken = `Bearer ${token}`;
        const extractedToken = bearerToken.split(' ')[1];
        const decodedBearer = jwt.verify(extractedToken, process.env.JWT_SECRET);
        console.log('Bearer token verified successfully');
        
        return token;
    } catch (error) {
        console.error('JWT Error:', error.message);
        return null;
    }
}

// Test API endpoints with authentication
async function testAuthEndpoints(token) {
    console.log('\n=== Testing API Endpoints ===');
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
            } else if (response.ok) {
                const data = await response.json();
                console.log(`  Success:`, JSON.stringify(data).substring(0, 100) + '...');
            }
        } catch (error) {
            console.error(`  Network Error:`, error.message);
        }
    }
}

// Check localStorage simulation (what frontend would have)
function checkFrontendToken() {
    console.log('\n=== Frontend Token Check ===');
    console.log('Note: In browser, token would be in localStorage as "auth_token"');
    console.log('Frontend retrieves with: localStorage.getItem("auth_token")');
    console.log('Frontend sends as: Authorization: Bearer <token>');
}

// Main test runner
async function runTests() {
    console.log('=== Authentication Debug Test ===');
    console.log('Server Port: 5001');
    console.log('API Base URL: http://localhost:5001');
    
    // Test JWT
    const testToken = testJWT();
    
    if (testToken) {
        // Test endpoints
        await testAuthEndpoints(testToken);
    }
    
    // Check frontend token info
    checkFrontendToken();
    
    console.log('\n=== Test Complete ===');
}

// Run tests
runTests().catch(console.error);