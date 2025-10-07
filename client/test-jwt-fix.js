// Test script to verify JWT authentication is working properly
const testJWT = async () => {
  console.log('=== JWT Authentication Test ===\n');
  
  // Test credentials
  const testEmail = 'test@example.com';
  const testPassword = 'Test123!@#';
  const apiBase = 'http://localhost:5001';
  
  try {
    // Step 1: Login to get JWT token
    console.log('1. Testing login endpoint...');
    const loginResponse = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: testEmail, 
        password: testPassword 
      }),
    });
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error(`Login failed (${loginResponse.status}):`, error);
      console.log('\nNote: Please ensure a test user exists with email: test@example.com');
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log(`✓ Login successful. Token received: ${token.substring(0, 20)}...`);
    
    // Step 2: Test authenticated endpoint
    console.log('\n2. Testing authenticated endpoint (/api/google-auth/accounts)...');
    const authResponse = await fetch(`${apiBase}/api/google-auth/accounts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!authResponse.ok) {
      const error = await authResponse.text();
      console.error(`Authenticated request failed (${authResponse.status}):`, error);
      return;
    }
    
    const authData = await authResponse.json();
    console.log('✓ Authenticated request successful. Response:', authData);
    
    // Step 3: Test dashboard endpoint
    console.log('\n3. Testing dashboard endpoint...');
    const dashResponse = await fetch(`${apiBase}/api/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!dashResponse.ok) {
      const error = await dashResponse.text();
      console.error(`Dashboard request failed (${dashResponse.status}):`, error);
      return;
    }
    
    const dashData = await dashResponse.json();
    console.log('✓ Dashboard request successful. User data received.');
    
    console.log('\n=== All JWT Authentication Tests Passed! ===');
    console.log('The JWT malformation issue has been successfully resolved.');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
};

// Run the test
testJWT();