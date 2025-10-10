const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';
const ADMIN_EMAIL = 'gameslayer.inc@gmail.com';
const ADMIN_PASSWORD = '121212Sanveed';

let adminToken = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function test1_PublicSetting() {
  console.log(`\n${colors.cyan}Test 1: Public Setting Access${colors.reset}`);
  console.log('Testing GET /api/settings (should be publicly accessible)...');
  
  try {
    const response = await axios.get(`${API_BASE}/settings`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Check for both possible response formats
    const hasAllowRegistration = response.data.allow_registration !== undefined ||
                                  (response.data.data && response.data.data.allow_registration !== undefined);
    
    if (hasAllowRegistration) {
      const value = response.data.allow_registration !== undefined
        ? response.data.allow_registration
        : response.data.data.allow_registration;
      console.log(`${colors.green}✓ Test 1 PASSED: Public setting retrieved successfully${colors.reset}`);
      console.log(`  allow_registration = ${value}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Test 1 FAILED: allow_registration not found in response${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Test 1 FAILED: ${error.message}${colors.reset}`);
    if (error.response) {
      console.log('Error response:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('  Server is not running on port 5001');
    }
    return false;
  }
}

async function test2_AdminAccessFail() {
  console.log(`\n${colors.cyan}Test 2: Admin Access Without Token (Should Fail)${colors.reset}`);
  console.log('Testing PATCH /api/settings/registration without auth token...');
  
  try {
    const response = await axios.patch(`${API_BASE}/settings/registration`, {
      allow_registration: false
    });
    console.log(`${colors.red}✗ Test 2 FAILED: Request should have been rejected but wasn't${colors.reset}`);
    console.log('Response:', response.data);
    return false;
  } catch (error) {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log(`${colors.green}✓ Test 2 PASSED: Request correctly rejected with status ${error.response.status}${colors.reset}`);
      console.log(`  Error message: ${error.response.data.message || error.response.data.error}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Test 2 FAILED: Unexpected error${colors.reset}`);
      console.log('Error:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.log('  Server is not running on port 5001');
      }
      return false;
    }
  }
}

async function loginAsAdmin() {
  console.log(`\n${colors.cyan}Logging in as admin...${colors.reset}`);
  console.log(`Email: ${ADMIN_EMAIL}`);
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data.token) {
      adminToken = response.data.token;
      console.log(`${colors.green}✓ Login successful${colors.reset}`);
      console.log(`  User: ${response.data.username || response.data.email}`);
      console.log(`  Is Admin: ${response.data.isAdmin}`);
      console.log(`  Token: ${adminToken.substring(0, 20)}...`);
      return true;
    } else {
      console.log(`${colors.red}✗ Login failed: No token received${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Login failed: ${error.message}${colors.reset}`);
    if (error.response) {
      console.log('Error response:', error.response.data);
    }
    return false;
  }
}

async function test3_AdminAccessSuccess() {
  console.log(`\n${colors.cyan}Test 3: Admin Access With Token (Should Succeed)${colors.reset}`);
  console.log('Testing PATCH /api/settings/registration with admin token...');
  
  if (!adminToken) {
    console.log(`${colors.red}✗ Test 3 SKIPPED: No admin token available${colors.reset}`);
    return false;
  }
  
  try {
    const response = await axios.patch(
      `${API_BASE}/settings/registration`,
      { allow_registration: false },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success || response.data.allow_registration === false) {
      console.log(`${colors.green}✓ Test 3 PASSED: Setting updated successfully${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.yellow}⚠ Test 3 WARNING: Response received but unclear if successful${colors.reset}`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Test 3 FAILED: ${error.message}${colors.reset}`);
    if (error.response) {
      console.log('Error response:', error.response.data);
    }
    return false;
  }
}

async function test4_VerifyChange() {
  console.log(`\n${colors.cyan}Test 4: Verify Setting Change${colors.reset}`);
  console.log('Testing GET /api/settings to verify the change...');
  
  try {
    const response = await axios.get(`${API_BASE}/settings`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Check for both possible response formats
    const value = response.data.allow_registration !== undefined
      ? response.data.allow_registration
      : (response.data.data ? response.data.data.allow_registration : undefined);
    
    if (value === false) {
      console.log(`${colors.green}✓ Test 4 PASSED: Setting successfully changed to false${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Test 4 FAILED: Setting not changed (value: ${value})${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Test 4 FAILED: ${error.message}${colors.reset}`);
    if (error.response) {
      console.log('Error response:', error.response.data);
    }
    return false;
  }
}

async function test5_ToggleBack() {
  console.log(`\n${colors.cyan}Test 5: Toggle Setting Back to True${colors.reset}`);
  console.log('Testing PATCH /api/settings/registration to set back to true...');
  
  if (!adminToken) {
    console.log(`${colors.red}✗ Test 5 SKIPPED: No admin token available${colors.reset}`);
    return false;
  }
  
  try {
    const response = await axios.patch(
      `${API_BASE}/settings/registration`,
      { allow_registration: true },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Verify the change
    const verifyResponse = await axios.get(`${API_BASE}/settings`);
    const value = verifyResponse.data.allow_registration !== undefined
      ? verifyResponse.data.allow_registration
      : (verifyResponse.data.data ? verifyResponse.data.data.allow_registration : undefined);
    
    if (value === true) {
      console.log(`${colors.green}✓ Test 5 PASSED: Setting successfully toggled back to true${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Test 5 FAILED: Setting not toggled back${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Test 5 FAILED: ${error.message}${colors.reset}`);
    if (error.response) {
      console.log('Error response:', error.response.data);
    }
    return false;
  }
}

async function runAllTests() {
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}Admin Dashboard Feature Tests${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`Server: ${API_BASE}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  const results = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
    test5: false
  };
  
  // Wait a moment for server to be ready
  console.log('\nWaiting 2 seconds for server to be fully ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run tests
  results.test1 = await test1_PublicSetting();
  results.test2 = await test2_AdminAccessFail();
  
  // Login as admin
  const loginSuccess = await loginAsAdmin();
  if (loginSuccess) {
    results.test3 = await test3_AdminAccessSuccess();
    results.test4 = await test4_VerifyChange();
    results.test5 = await test5_ToggleBack();
  }
  
  // Summary
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}Test Summary${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  let passed = 0;
  let failed = 0;
  for (const [test, result] of Object.entries(results)) {
    if (result) {
      console.log(`${colors.green}✓ ${test.toUpperCase()}: PASSED${colors.reset}`);
      passed++;
    } else {
      console.log(`${colors.red}✗ ${test.toUpperCase()}: FAILED${colors.reset}`);
      failed++;
    }
  }
  
  console.log(`\n${colors.blue}Total: ${passed} passed, ${failed} failed${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.green}ALL TESTS PASSED! Admin dashboard features working correctly.${colors.reset}`);
    console.log(`${colors.green}${'='.repeat(60)}${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.red}SOME TESTS FAILED. Please review the output above.${colors.reset}`);
    console.log(`${colors.red}${'='.repeat(60)}${colors.reset}`);
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run all tests
runAllTests().catch(error => {
  console.error(`${colors.red}Fatal error running tests:${colors.reset}`, error);
  process.exit(1);
});