const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

// Test credentials
const ADMIN_EMAIL = 'gameslayer.inc@gmail.com';
const ADMIN_PASSWORD = '121212Sanveed';

// Add detailed logging
console.log('='.repeat(60));
console.log('REGISTRATION TOGGLE DIAGNOSTIC TEST');
console.log('='.repeat(60));
console.log(`Testing API at: ${API_BASE_URL}`);
console.log(`Admin email: ${ADMIN_EMAIL}`);
console.log('');

async function runDiagnostic() {
  let authToken = null;
  
  try {
    // Step 1: Login to get auth token
    console.log('Step 1: Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    authToken = loginResponse.data.token;
    console.log('✓ Login successful, token obtained');
    console.log(`  Token prefix: ${authToken.substring(0, 20)}...`);
    console.log('');
    
    // Step 2: Test with INCORRECTLY formatted body (boolean directly)
    console.log('Step 2: Testing with INCORRECT format (boolean directly)...');
    console.log('  Sending body: true');
    
    try {
      await axios.patch(
        `${API_BASE_URL}/settings/registration`,
        true, // Sending boolean directly - WRONG FORMAT
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('  Unexpected: Request succeeded with wrong format!');
    } catch (error) {
      console.log(`  ✓ Expected error occurred: ${error.response?.status} ${error.response?.statusText}`);
      console.log(`  Error message: ${error.response?.data?.message || error.response?.data}`);
    }
    console.log('');
    
    // Step 3: Test with another INCORRECT format (wrong key name)
    console.log('Step 3: Testing with INCORRECT key (camelCase)...');
    console.log('  Sending body: { allowRegistration: true }');
    
    try {
      await axios.patch(
        `${API_BASE_URL}/settings/registration`,
        { allowRegistration: true }, // Wrong key name
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('  Unexpected: Request succeeded with wrong key!');
    } catch (error) {
      console.log(`  ✓ Expected error occurred: ${error.response?.status} ${error.response?.statusText}`);
      console.log(`  Error message: ${error.response?.data?.message || error.response?.data}`);
    }
    console.log('');
    
    // Step 4: Test with CORRECT format (snake_case)
    console.log('Step 4: Testing with CORRECT format (snake_case)...');
    console.log('  Sending body: { allow_registration: true }');
    
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/settings/registration`,
        { allow_registration: true }, // Correct format with snake_case
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`  ✓ Request successful: ${response.status} ${response.statusText}`);
      console.log(`  Response data:`, response.data);
    } catch (error) {
      console.log(`  ✗ Unexpected error: ${error.response?.status} ${error.response?.statusText}`);
      console.log(`  Error details:`, error.response?.data);
    }
    console.log('');
    
    // Step 5: Test toggling back to false
    console.log('Step 5: Testing toggle to false...');
    console.log('  Sending body: { allow_registration: false }');
    
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/settings/registration`,
        { allow_registration: false },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`  ✓ Request successful: ${response.status} ${response.statusText}`);
      console.log(`  Response data:`, response.data);
    } catch (error) {
      console.log(`  ✗ Unexpected error: ${error.response?.status} ${error.response?.statusText}`);
      console.log(`  Error details:`, error.response?.data);
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('DIAGNOSTIC COMPLETE');
    console.log('');
    console.log('FINDINGS:');
    console.log('- Backend expects: { allow_registration: boolean }');
    console.log('- Key must be in snake_case format');
    console.log('- Body must be a JSON object, not a raw boolean');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Fatal error during diagnostic:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the diagnostic
runDiagnostic();