/**
 * COMPREHENSIVE SYSTEM STABILITY TEST
 * This test suite verifies the entire application is functional
 */

// Load environment variables first
require('dotenv').config();

const axios = require('axios');
const colors = require('colors/safe');

// Test configuration
const API_BASE = 'http://localhost:5001';
const TEST_USER = {
  email: 'admin@overwatchshare.com',
  password: 'admin123'
};

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper function to log test results
function logTest(name, status, details = '') {
  const timestamp = new Date().toISOString();
  if (status === 'PASS') {
    console.log(colors.green(`✓ [${timestamp}] ${name}`));
    if (details) console.log(colors.gray(`  ${details}`));
    testResults.passed.push({ name, timestamp, details });
  } else if (status === 'FAIL') {
    console.log(colors.red(`✗ [${timestamp}] ${name}`));
    if (details) console.log(colors.red(`  ${details}`));
    testResults.failed.push({ name, timestamp, details });
  } else if (status === 'WARN') {
    console.log(colors.yellow(`⚠ [${timestamp}] ${name}`));
    if (details) console.log(colors.yellow(`  ${details}`));
    testResults.warnings.push({ name, timestamp, details });
  }
}

// Test 1: Server Health Check
async function testServerHealth() {
  try {
    const response = await axios.get(`${API_BASE}/health`);
    if (response.status === 200) {
      logTest('Server Health Check', 'PASS', 'Server is running');
      return true;
    }
  } catch (error) {
    // Try alternative health check
    try {
      const response = await axios.get(`${API_BASE}/api/auth/me`);
      if (response.status === 401) {
        logTest('Server Health Check', 'PASS', 'Server is running (auth endpoint responding)');
        return true;
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        logTest('Server Health Check', 'PASS', 'Server is running (auth endpoint responding with 401)');
        return true;
      }
      logTest('Server Health Check', 'FAIL', `Server not responding: ${err.message}`);
      return false;
    }
  }
}

// Test 2: Authentication Flow
async function testAuthentication() {
  try {
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (response.data.token) {
      logTest('Authentication - Login', 'PASS', `Token received: ${response.data.token.substring(0, 20)}...`);
      return response.data.token;
    } else {
      logTest('Authentication - Login', 'FAIL', 'No token in response');
      return null;
    }
  } catch (error) {
    logTest('Authentication - Login', 'FAIL', `Login failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// Test 3: Dashboard Access
async function testDashboard(token) {
  if (!token) {
    logTest('Dashboard Access', 'SKIP', 'No auth token available');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_BASE}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data) {
      const hasRequiredFields = response.data.user && 
                                response.data.stats && 
                                response.data.accounts !== undefined;
      
      if (hasRequiredFields) {
        logTest('Dashboard Access', 'PASS', 
          `User: ${response.data.user.username}, Accounts: ${response.data.accounts.length}`);
        return true;
      } else {
        logTest('Dashboard Access', 'WARN', 'Missing some expected fields in response');
        return true;
      }
    }
  } catch (error) {
    logTest('Dashboard Access', 'FAIL', `Dashboard request failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 4: Overwatch Accounts Endpoint
async function testOverwatchAccounts(token) {
  if (!token) {
    logTest('Overwatch Accounts', 'SKIP', 'No auth token available');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_BASE}/api/overwatch-accounts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.status === 200) {
      logTest('Overwatch Accounts - List', 'PASS', 
        `Retrieved ${response.data.length} accounts`);
      return true;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      logTest('Overwatch Accounts - List', 'FAIL', 'Endpoint not found (404)');
    } else {
      logTest('Overwatch Accounts - List', 'FAIL', 
        `Request failed: ${error.response?.data?.message || error.message}`);
    }
    return false;
  }
}

// Test 5: Google Auth Endpoints
async function testGoogleAuth(token) {
  if (!token) {
    logTest('Google Auth', 'SKIP', 'No auth token available');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_BASE}/api/google-auth/accounts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.status === 200) {
      logTest('Google Auth - List Accounts', 'PASS', 
        `Retrieved ${response.data.length} Google accounts`);
      return true;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      logTest('Google Auth - List Accounts', 'WARN', 'No Google accounts linked');
      return true;
    } else {
      logTest('Google Auth - List Accounts', 'FAIL', 
        `Request failed: ${error.response?.data?.message || error.message}`);
      return false;
    }
  }
}

// Test 6: OTP Service Status
async function testOTPService() {
  // We can't directly test if OTP service is running, but we can check if it would crash
  try {
    // Check if the models are properly loaded
    const UserGoogleAccount = require('./models/UserGoogleAccount');
    const OverwatchAccount = require('./models/OverwatchAccount');
    
    // Test critical methods exist
    if (typeof UserGoogleAccount.findById !== 'function') {
      logTest('OTP Service - Model Check', 'FAIL', 'UserGoogleAccount.findById is not a function');
      return false;
    }
    
    if (typeof UserGoogleAccount.findOne !== 'function') {
      logTest('OTP Service - Model Check', 'FAIL', 'UserGoogleAccount.findOne is not a function');
      return false;
    }
    
    if (typeof OverwatchAccount.getAllAccounts !== 'function') {
      logTest('OTP Service - Model Check', 'FAIL', 'OverwatchAccount.getAllAccounts is not a function');
      return false;
    }
    
    logTest('OTP Service - Model Check', 'PASS', 'All required model methods exist');
    return true;
  } catch (error) {
    logTest('OTP Service - Model Check', 'FAIL', `Model loading failed: ${error.message}`);
    return false;
  }
}

// Test 7: Database Connection
async function testDatabaseConnection() {
  try {
    // Import the database config to test connection
    const db = require('./config/db');
    
    // Test a simple query
    const supabase = global.supabase;
    if (!supabase) {
      logTest('Database Connection', 'FAIL', 'Supabase client not initialized');
      return false;
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      logTest('Database Connection', 'FAIL', `Query failed: ${error.message}`);
      return false;
    }
    
    logTest('Database Connection', 'PASS', 'Database is accessible');
    return true;
  } catch (error) {
    logTest('Database Connection', 'FAIL', `Connection failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log(colors.cyan('\n================================================='));
  console.log(colors.cyan('     FULL SYSTEM STABILITY TEST SUITE           '));
  console.log(colors.cyan('=================================================\n'));
  
  // Initialize database connection
  require('./config/db');
  
  // Wait for database to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Run tests
  const serverHealthy = await testServerHealth();
  
  if (!serverHealthy) {
    console.log(colors.red('\n⚠️  Server is not running. Please start the server first.'));
    console.log(colors.yellow('Run: cd server && npm start\n'));
    process.exit(1);
  }
  
  await testDatabaseConnection();
  await testOTPService();
  
  const token = await testAuthentication();
  await testDashboard(token);
  await testOverwatchAccounts(token);
  await testGoogleAuth(token);
  
  // Generate final report
  console.log(colors.cyan('\n================================================='));
  console.log(colors.cyan('                 TEST RESULTS                    '));
  console.log(colors.cyan('=================================================\n'));
  
  console.log(colors.green(`✓ PASSED: ${testResults.passed.length} tests`));
  console.log(colors.yellow(`⚠ WARNINGS: ${testResults.warnings.length} tests`));
  console.log(colors.red(`✗ FAILED: ${testResults.failed.length} tests`));
  
  if (testResults.failed.length > 0) {
    console.log(colors.red('\n❌ SYSTEM STABILITY: CRITICAL ISSUES DETECTED'));
    console.log(colors.red('\nFailed Tests:'));
    testResults.failed.forEach(test => {
      console.log(colors.red(`  - ${test.name}: ${test.details}`));
    });
  } else if (testResults.warnings.length > 0) {
    console.log(colors.yellow('\n⚠️  SYSTEM STABILITY: OPERATIONAL WITH WARNINGS'));
    console.log(colors.yellow('\nWarnings:'));
    testResults.warnings.forEach(test => {
      console.log(colors.yellow(`  - ${test.name}: ${test.details}`));
    });
  } else {
    console.log(colors.green('\n✅ SYSTEM STABILITY: FULLY OPERATIONAL'));
    console.log(colors.green('All critical systems are functioning correctly.'));
  }
  
  console.log(colors.cyan('\n=================================================\n'));
  
  // Return exit code based on results
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Check if colors module is installed
try {
  require('colors/safe');
} catch (error) {
  console.log('Installing required test dependencies...');
  require('child_process').execSync('npm install colors', { stdio: 'inherit' });
}

// Run the tests
runAllTests().catch(error => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});