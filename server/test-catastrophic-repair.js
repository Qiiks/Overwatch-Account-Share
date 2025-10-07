/**
 * CATASTROPHIC FAILURE REPAIR TEST
 * This test verifies the entire application is functional after fixing the 404 errors
 */

const http = require('http');
const https = require('https');

// Use http since the server falls back to HTTP when certs are not found
const client = http;

const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}`;

// Test configuration
const testUser = {
  username: 'testuser_' + Date.now(),
  email: `testuser_${Date.now()}@test.com`,
  password: 'TestPassword123!'
};

let authToken = null;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData ? JSON.parse(responseData) : null
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function waitForServer(retries = 30) {
  log('\n🔄 Waiting for server to be ready...', 'cyan');
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await makeRequest('GET', '/health');
      if (response.statusCode === 200) {
        log('✅ Server is ready!', 'green');
        return true;
      }
    } catch (error) {
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('Server failed to start after 30 seconds');
}

async function runTests() {
  log('\n' + '='.repeat(80), 'bright');
  log('CATASTROPHIC FAILURE REPAIR TEST - FULL SYSTEM VERIFICATION', 'bright');
  log('='.repeat(80) + '\n', 'bright');

  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    critical: []
  };

  // Test 1: Server Health Check
  log('\n📍 TEST 1: Server Health Check', 'yellow');
  testResults.total++;
  try {
    const response = await makeRequest('GET', '/health');
    if (response.statusCode === 200) {
      log(`  ✅ PASS: Server is healthy (Status: ${response.statusCode})`, 'green');
      testResults.passed++;
    } else {
      throw new Error(`Unexpected status: ${response.statusCode}`);
    }
  } catch (error) {
    log(`  ❌ FAIL: Server health check failed: ${error.message}`, 'red');
    testResults.failed++;
    testResults.critical.push('Server health check');
  }

  // Test 2: Google Auth Accounts Endpoint (Unauthenticated - Should be 401)
  log('\n📍 TEST 2: Google Auth Accounts Endpoint (Unauthenticated)', 'yellow');
  testResults.total++;
  try {
    const response = await makeRequest('GET', '/api/google-auth/accounts');
    if (response.statusCode === 401) {
      log(`  ✅ PASS: Correctly returns 401 Unauthorized (Not 404!)`, 'green');
      testResults.passed++;
    } else if (response.statusCode === 404) {
      throw new Error('CRITICAL: Still returning 404 - Routes not fixed!');
    } else {
      throw new Error(`Unexpected status: ${response.statusCode}`);
    }
  } catch (error) {
    log(`  ❌ FAIL: ${error.message}`, 'red');
    testResults.failed++;
    testResults.critical.push('Google Auth Routes');
  }

  // Test 3: User Registration
  log('\n📍 TEST 3: User Registration', 'yellow');
  testResults.total++;
  try {
    const response = await makeRequest('POST', '/api/auth/register', testUser);
    if (response.statusCode === 201 || response.statusCode === 200) {
      log(`  ✅ PASS: User registered successfully`, 'green');
      testResults.passed++;
      if (response.data.token) {
        authToken = response.data.token;
      }
    } else if (response.statusCode === 409) {
      log(`  ⚠️  User already exists, proceeding with login`, 'yellow');
      testResults.passed++;
    } else {
      throw new Error(`Registration failed with status: ${response.statusCode}`);
    }
  } catch (error) {
    log(`  ❌ FAIL: Registration failed: ${error.message}`, 'red');
    testResults.failed++;
  }

  // Test 4: User Login
  log('\n📍 TEST 4: User Login', 'yellow');
  testResults.total++;
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      username: testUser.username,
      password: testUser.password
    });
    if (response.statusCode === 200 && response.data.token) {
      log(`  ✅ PASS: Login successful, token received`, 'green');
      authToken = response.data.token;
      testResults.passed++;
    } else {
      throw new Error(`Login failed with status: ${response.statusCode}`);
    }
  } catch (error) {
    log(`  ❌ FAIL: Login failed: ${error.message}`, 'red');
    testResults.failed++;
    testResults.critical.push('Authentication');
  }

  // Test 5: Google Auth Accounts Endpoint (Authenticated - Should be 200)
  log('\n📍 TEST 5: Google Auth Accounts Endpoint (Authenticated)', 'yellow');
  testResults.total++;
  try {
    const response = await makeRequest('GET', '/api/google-auth/accounts', null, authToken);
    if (response.statusCode === 200) {
      log(`  ✅ PASS: Successfully accessed authenticated endpoint (Status: 200)`, 'green');
      log(`  📊 Response: ${JSON.stringify(response.data)}`, 'cyan');
      testResults.passed++;
    } else if (response.statusCode === 404) {
      throw new Error('CRITICAL: Still returning 404 - Routes not properly connected!');
    } else {
      throw new Error(`Unexpected status: ${response.statusCode}`);
    }
  } catch (error) {
    log(`  ❌ FAIL: ${error.message}`, 'red');
    testResults.failed++;
    testResults.critical.push('Authenticated Google Auth Routes');
  }

  // Test 6: Dashboard Endpoint
  log('\n📍 TEST 6: Dashboard Endpoint', 'yellow');
  testResults.total++;
  try {
    const response = await makeRequest('GET', '/api/dashboard', null, authToken);
    if (response.statusCode === 200) {
      log(`  ✅ PASS: Dashboard accessible (Status: 200)`, 'green');
      testResults.passed++;
    } else {
      throw new Error(`Dashboard access failed with status: ${response.statusCode}`);
    }
  } catch (error) {
    log(`  ❌ FAIL: Dashboard access failed: ${error.message}`, 'red');
    testResults.failed++;
  }

  // Test 7: Overwatch Accounts Endpoint
  log('\n📍 TEST 7: Overwatch Accounts Endpoint', 'yellow');
  testResults.total++;
  try {
    const response = await makeRequest('GET', '/api/overwatch-accounts', null, authToken);
    if (response.statusCode === 200) {
      log(`  ✅ PASS: Overwatch accounts accessible (Status: 200)`, 'green');
      testResults.passed++;
    } else {
      throw new Error(`Overwatch accounts access failed with status: ${response.statusCode}`);
    }
  } catch (error) {
    log(`  ❌ FAIL: Overwatch accounts access failed: ${error.message}`, 'red');
    testResults.failed++;
  }

  // Test 8: All Google Auth Routes
  log('\n📍 TEST 8: All Google Auth Routes Verification', 'yellow');
  const googleAuthRoutes = [
    { method: 'GET', path: '/api/google-auth/accounts', requiresAuth: true, expectedStatus: 200 },
    { method: 'POST', path: '/api/google-auth/otp/auth', requiresAuth: true, expectedStatus: [200, 500] }, // 500 if Google creds not configured
    { method: 'GET', path: '/api/google-auth/auth', requiresAuth: false, expectedStatus: 501 }, // Legacy route
    { method: 'GET', path: '/api/google-auth/callback', requiresAuth: false, expectedStatus: 501 } // Legacy route
  ];

  for (const route of googleAuthRoutes) {
    testResults.total++;
    try {
      const response = await makeRequest(
        route.method, 
        route.path, 
        route.method === 'POST' ? {} : null,
        route.requiresAuth ? authToken : null
      );
      
      const expectedStatuses = Array.isArray(route.expectedStatus) ? route.expectedStatus : [route.expectedStatus];
      if (expectedStatuses.includes(response.statusCode)) {
        log(`  ✅ PASS: ${route.method} ${route.path} -> ${response.statusCode} (Expected)`, 'green');
        testResults.passed++;
      } else if (response.statusCode === 404) {
        throw new Error(`CRITICAL: Route not found (404)!`);
      } else {
        throw new Error(`Unexpected status: ${response.statusCode}`);
      }
    } catch (error) {
      log(`  ❌ FAIL: ${route.method} ${route.path} -> ${error.message}`, 'red');
      testResults.failed++;
      if (error.message.includes('404')) {
        testResults.critical.push(`${route.method} ${route.path}`);
      }
    }
  }

  // Final Report
  log('\n' + '='.repeat(80), 'bright');
  log('TEST RESULTS SUMMARY', 'bright');
  log('='.repeat(80), 'bright');
  
  log(`\nTotal Tests: ${testResults.total}`, 'cyan');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  
  if (testResults.critical.length > 0) {
    log('\n⚠️  CRITICAL FAILURES:', 'red');
    testResults.critical.forEach(item => {
      log(`  - ${item}`, 'red');
    });
  }

  const successRate = (testResults.passed / testResults.total * 100).toFixed(1);
  
  if (testResults.failed === 0) {
    log('\n🎉 SUCCESS: ALL TESTS PASSED!', 'green');
    log('The application has been successfully repaired and is fully functional.', 'green');
  } else if (testResults.critical.length > 0) {
    log('\n❌ CRITICAL: The 404 error persists! Google Auth routes are still not accessible.', 'red');
    log('The repair has FAILED. Further investigation required.', 'red');
  } else {
    log(`\n⚠️  PARTIAL SUCCESS: ${successRate}% tests passed`, 'yellow');
    log('Some non-critical issues remain.', 'yellow');
  }
  
  log('\n' + '='.repeat(80) + '\n', 'bright');

  return testResults;
}

// Main execution
async function main() {
  try {
    // First, check if server is already running
    try {
      const response = await makeRequest('GET', '/health');
      if (response.statusCode === 200) {
        log('✅ Server is already running', 'green');
      }
    } catch (error) {
      // Server not running, start it
      log('🚀 Starting server...', 'cyan');
      const { spawn } = require('child_process');
      const serverProcess = spawn('node', ['server.js'], {
        cwd: __dirname,
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      serverProcess.stdout.on('data', (data) => {
        if (process.env.DEBUG) {
          console.log(`Server: ${data}`);
        }
      });
      
      serverProcess.stderr.on('data', (data) => {
        if (process.env.DEBUG) {
          console.error(`Server Error: ${data}`);
        }
      });

      // Wait for server to be ready
      await waitForServer();
      
      // Clean up on exit
      process.on('exit', () => {
        serverProcess.kill();
      });
    }

    // Run the tests
    const results = await runTests();
    
    // Exit with appropriate code
    process.exit(results.failed === 0 ? 0 : 1);
    
  } catch (error) {
    log(`\n❌ FATAL ERROR: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the test
main();