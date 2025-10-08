const https = require('https');

// Production URLs
const FRONTEND_URL = 'https://overwatch.qiikzx.dev';
const BACKEND_URL = 'https://bwgg4wow8kggc48kko0g080c.qiikzx.dev';

// Test credentials (you may need to update these)
const TEST_EMAIL = 'admin@admin.com';
const TEST_PASSWORD = '123123';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL,
        'Accept': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testCORS() {
  log('\n=== Testing CORS Configuration ===', 'cyan');
  
  try {
    // Test preflight request
    log('Testing preflight OPTIONS request...', 'blue');
    const optionsResponse = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization'
      }
    });
    
    log(`OPTIONS Response Status: ${optionsResponse.status}`, 
        optionsResponse.status === 200 ? 'green' : 'red');
    
    // Check CORS headers
    const corsHeaders = {
      'access-control-allow-origin': optionsResponse.headers['access-control-allow-origin'],
      'access-control-allow-credentials': optionsResponse.headers['access-control-allow-credentials'],
      'access-control-allow-methods': optionsResponse.headers['access-control-allow-methods'],
      'access-control-allow-headers': optionsResponse.headers['access-control-allow-headers']
    };
    
    log('CORS Headers:', 'yellow');
    for (const [key, value] of Object.entries(corsHeaders)) {
      const status = value ? '✓' : '✗';
      const color = value ? 'green' : 'red';
      log(`  ${status} ${key}: ${value || 'MISSING'}`, color);
    }
    
    return optionsResponse.status === 200 && corsHeaders['access-control-allow-origin'];
  } catch (error) {
    log(`CORS test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testLogin() {
  log('\n=== Testing Login Endpoint ===', 'cyan');
  
  try {
    log(`Attempting login with email: ${TEST_EMAIL}`, 'blue');
    
    const loginResponse = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      }
    });
    
    log(`Login Response Status: ${loginResponse.status}`, 
        loginResponse.status === 200 ? 'green' : 'red');
    
    if (loginResponse.data) {
      log('Response Data:', 'yellow');
      const { token, ...safeData } = loginResponse.data;
      console.log(JSON.stringify(safeData, null, 2));
      
      if (token) {
        log('✓ JWT Token received', 'green');
        return { success: true, token };
      } else if (loginResponse.data.error) {
        log(`✗ Login error: ${loginResponse.data.error}`, 'red');
        return { success: false, error: loginResponse.data.error };
      }
    }
    
    return { success: false, status: loginResponse.status };
  } catch (error) {
    log(`Login test failed: ${error.message}`, 'red');
    console.error(error);
    return { success: false, error: error.message };
  }
}

async function testAuthenticatedRequest(token) {
  log('\n=== Testing Authenticated Request ===', 'cyan');
  
  try {
    log('Testing /api/auth/me endpoint with JWT token...', 'blue');
    
    const meResponse = await makeRequest(`${BACKEND_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    log(`Auth/Me Response Status: ${meResponse.status}`, 
        meResponse.status === 200 ? 'green' : 'red');
    
    if (meResponse.data) {
      log('User Data Retrieved:', 'yellow');
      console.log(JSON.stringify(meResponse.data, null, 2));
      return meResponse.status === 200;
    }
    
    return false;
  } catch (error) {
    log(`Authenticated request test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testHealthCheck() {
  log('\n=== Testing Health Check ===', 'cyan');
  
  try {
    log('Checking backend health status...', 'blue');
    
    const healthResponse = await makeRequest(`${BACKEND_URL}/health`);
    
    log(`Health Check Status: ${healthResponse.status}`, 
        healthResponse.status === 200 ? 'green' : 'red');
    
    if (healthResponse.data) {
      log('Health Status:', 'yellow');
      console.log(JSON.stringify(healthResponse.data, null, 2));
      return healthResponse.status === 200;
    }
    
    return false;
  } catch (error) {
    log(`Health check failed: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(50), 'bright');
  log('PRODUCTION FIX VERIFICATION TEST', 'bright');
  log('='.repeat(50), 'bright');
  log(`Frontend URL: ${FRONTEND_URL}`, 'cyan');
  log(`Backend URL: ${BACKEND_URL}`, 'cyan');
  log('='.repeat(50), 'bright');
  
  const results = {
    health: false,
    cors: false,
    login: false,
    authenticated: false
  };
  
  // Test 1: Health Check
  results.health = await testHealthCheck();
  
  // Test 2: CORS
  results.cors = await testCORS();
  
  // Test 3: Login
  const loginResult = await testLogin();
  results.login = loginResult.success;
  
  // Test 4: Authenticated Request (only if login succeeded)
  if (loginResult.token) {
    results.authenticated = await testAuthenticatedRequest(loginResult.token);
  }
  
  // Summary
  log('\n' + '='.repeat(50), 'bright');
  log('TEST SUMMARY', 'bright');
  log('='.repeat(50), 'bright');
  
  let allPassed = true;
  for (const [test, passed] of Object.entries(results)) {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? 'green' : 'red';
    log(`${test.padEnd(15)} : ${status}`, color);
    if (!passed) allPassed = false;
  }
  
  log('='.repeat(50), 'bright');
  
  if (allPassed) {
    log('\n🎉 ALL TESTS PASSED! The production deployment is FIXED! 🎉', 'green');
  } else {
    log('\n⚠️  Some tests failed. The production deployment needs attention.', 'red');
    
    // Provide specific remediation advice
    if (!results.health) {
      log('\n📋 Health Check Failed:', 'yellow');
      log('   - Check if the backend is running', 'reset');
      log('   - Verify database connection', 'reset');
    }
    
    if (!results.cors) {
      log('\n📋 CORS Failed:', 'yellow');
      log('   - Verify CORS middleware is configured', 'reset');
      log('   - Check allowed origins include frontend URL', 'reset');
      log('   - Ensure OPTIONS requests are handled', 'reset');
    }
    
    if (!results.login) {
      log('\n📋 Login Failed:', 'yellow');
      log('   - Check database for test user', 'reset');
      log('   - Verify password hashing', 'reset');
      log('   - Check JWT_SECRET is set', 'reset');
      log('   - Review error logs for specific issue', 'reset');
    }
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});