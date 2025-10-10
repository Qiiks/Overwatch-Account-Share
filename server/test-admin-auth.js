/**
 * Test script to diagnose admin authentication issues
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test token that should work
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg2OTZkZjFmLTBiYjktNDIyMi1iN2EzLTYxMzU2NzhlMjYxZiIsInVzZXJuYW1lIjoiUWlpa3p4IiwiZW1haWwiOiJnYW1lc2xheWVyLmluY0BnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpc0FkbWluIjp0cnVlLCJpYXQiOjE3NjAwODI4Nzd9.example';

console.log('Testing JWT Authentication for Admin Endpoints\n');
console.log('================================================\n');

// 1. Check if JWT_SECRET is configured
if (!process.env.JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET is not set in environment variables!');
    console.log('This will cause all authentication to fail.');
    process.exit(1);
} else {
    console.log('✅ JWT_SECRET is configured');
}

// 2. Try to generate a valid token for testing
try {
    const testPayload = {
        id: '8696df1f-0bb9-4222-b7a3-6135678e261f',
        username: 'Qiikzx',
        email: 'gameslayer.inc@gmail.com',
        role: 'admin',
        isAdmin: true
    };
    
    const newToken = jwt.sign(testPayload, process.env.JWT_SECRET);
    console.log('\n✅ Successfully generated test token');
    console.log('Token (first 50 chars):', newToken.substring(0, 50) + '...');
    
    // Verify the token works
    const decoded = jwt.verify(newToken, process.env.JWT_SECRET);
    console.log('\n✅ Token verification successful');
    console.log('Decoded payload:', decoded);
    
    // Test with axios/fetch
    const fetch = require('node-fetch');
    const apiBase = 'http://localhost:5001';
    
    console.log('\n🔍 Testing admin endpoints with valid token...\n');
    
    // Test /api/admin/dashboard
    fetch(`${apiBase}/api/admin/dashboard`, {
        headers: {
            'Authorization': `Bearer ${newToken}`
        }
    })
    .then(res => {
        if (res.status === 200) {
            console.log('✅ /api/admin/dashboard - SUCCESS (200)');
        } else if (res.status === 401) {
            console.log('❌ /api/admin/dashboard - UNAUTHORIZED (401)');
            console.log('   The token was rejected by the server');
        } else {
            console.log(`⚠️  /api/admin/dashboard - Status ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        if (data.stats) {
            console.log('   Response contains stats:', Object.keys(data.stats));
        } else if (data.message) {
            console.log('   Error message:', data.message);
        }
    })
    .catch(err => {
        console.error('❌ Failed to test /api/admin/dashboard:', err.message);
    });
    
    // Test /api/admin/users
    setTimeout(() => {
        fetch(`${apiBase}/api/admin/users`, {
            headers: {
                'Authorization': `Bearer ${newToken}`
            }
        })
        .then(res => {
            if (res.status === 200) {
                console.log('\n✅ /api/admin/users - SUCCESS (200)');
            } else if (res.status === 401) {
                console.log('\n❌ /api/admin/users - UNAUTHORIZED (401)');
                console.log('   The token was rejected by the server');
            } else {
                console.log(`\n⚠️  /api/admin/users - Status ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (Array.isArray(data)) {
                console.log(`   Response contains ${data.length} users`);
            } else if (data.message) {
                console.log('   Error message:', data.message);
            }
        })
        .catch(err => {
            console.error('❌ Failed to test /api/admin/users:', err.message);
        });
    }, 1000);
    
    // Provide solution
    setTimeout(() => {
        console.log('\n================================================');
        console.log('SOLUTION FOR YOUR BROWSER:\n');
        console.log('1. Open Chrome DevTools (F12)');
        console.log('2. Go to the Application tab');
        console.log('3. Clear all localStorage items');
        console.log('4. Log out and log in again');
        console.log('5. Check that localStorage has:');
        console.log('   - auth_token: Your JWT token');
        console.log('   - user: User object with id, username, email, role, isAdmin');
        console.log('   - is_admin: "true"');
        console.log('\nOr run this in the browser console:');
        console.log('localStorage.clear(); location.href = "/login";');
        console.log('================================================\n');
    }, 2000);
    
} catch (error) {
    console.error('\n❌ Token generation/verification failed:', error.message);
    console.log('This indicates a problem with JWT configuration');
}