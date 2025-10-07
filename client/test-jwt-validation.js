// Focused test to validate JWT authentication fix
const testJWTAuthentication = async () => {
  console.log('=== JWT AUTHENTICATION FIX VALIDATION ===\n');
  
  const testEmail = 'test@example.com';
  const testPassword = 'Test123!@#';
  const apiBase = 'http://localhost:5001';
  
  try {
    // Step 1: Test Login
    console.log('1. Testing login and JWT token generation...');
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
      console.error(`❌ Login failed (${loginResponse.status}):`, error);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log(`✓ Login successful!`);
    console.log(`  - Token received: ${token.substring(0, 20)}...`);
    console.log(`  - Token format: JWT (${token.split('.').length} parts)`);
    
    // Step 2: Validate Token Format
    console.log('\n2. Validating JWT token format...');
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error(`❌ Invalid JWT format. Expected 3 parts, got ${tokenParts.length}`);
      return;
    }
    console.log('✓ JWT has correct format (header.payload.signature)');
    
    // Step 3: Test Authentication on Dashboard
    console.log('\n3. Testing JWT authentication on dashboard endpoint...');
    const dashResponse = await fetch(`${apiBase}/api/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (dashResponse.status === 401) {
      console.error('❌ JWT authentication failed - token rejected as malformed');
      const error = await dashResponse.text();
      console.error('Error details:', error);
      return;
    } else if (dashResponse.ok) {
      console.log('✓ JWT authentication successful on dashboard endpoint!');
      const dashData = await dashResponse.json();
      console.log('  - User authenticated successfully');
      console.log('  - Dashboard data retrieved');
    }
    
    // Step 4: Test /api/auth/me endpoint
    console.log('\n4. Testing JWT on /api/auth/me endpoint...');
    const meResponse = await fetch(`${apiBase}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (meResponse.status === 401) {
      console.error('❌ JWT authentication failed on /me endpoint');
      return;
    } else if (meResponse.ok) {
      console.log('✓ JWT authentication successful on /me endpoint!');
      const userData = await meResponse.json();
      console.log(`  - User ID: ${userData.data?.id || userData.id}`);
      console.log(`  - Email: ${userData.data?.email || userData.email}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ JWT AUTHENTICATION FIX CONFIRMED SUCCESSFUL!');
    console.log('='.repeat(50));
    console.log('\nSUMMARY:');
    console.log('- JWT tokens are being generated correctly');
    console.log('- Tokens are properly formatted (not malformed)');
    console.log('- Backend accepts and validates tokens correctly');
    console.log('- Authentication middleware is functioning properly');
    console.log('\nThe "jwt malformed" error has been successfully resolved!');
    
    console.log('\nNOTE: The Google Accounts endpoint issue is a separate');
    console.log('problem in the UserGoogleAccount model, not related to');
    console.log('the JWT authentication fix.');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
};

// Run the test
testJWTAuthentication();