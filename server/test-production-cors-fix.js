#!/usr/bin/env node

/**
 * PRODUCTION CORS & WEBSOCKET VERIFICATION TEST
 * 
 * This test verifies that the CORS and WebSocket configuration
 * is correctly set up for production deployment on Coolify.
 * 
 * Tests:
 * 1. CORS headers for API requests from production frontend
 * 2. WebSocket connections from production frontend
 * 3. Authentication flow with proper CORS handling
 * 4. Preflight requests (OPTIONS) handling
 */

const axios = require('axios');
const io = require('socket.io-client');

// Production URLs
const FRONTEND_URL = 'https://overwatch.qiikzx.dev';
const BACKEND_URL = 'https://bwgg4wow8kggc48kko0g080c.qiikzx.dev';

// Test credentials (from earlier tests)
const TEST_USER = {
  username: 'testuser',
  password: 'Test123!@#'
};

// Colors for console output
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

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test results tracker
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

async function testPreflightRequest() {
  logSection('1. Testing Preflight (OPTIONS) Request');
  
  try {
    const response = await axios.options(`${BACKEND_URL}/api/auth/login`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    
    const headers = response.headers;
    
    // Check for required CORS headers
    if (headers['access-control-allow-origin']) {
      logSuccess(`Allow-Origin header present: ${headers['access-control-allow-origin']}`);
      
      if (headers['access-control-allow-origin'] === FRONTEND_URL || 
          headers['access-control-allow-origin'] === '*') {
        logSuccess('Allow-Origin matches frontend URL or allows all');
        testResults.passed.push('Preflight Allow-Origin');
      } else {
        logError(`Allow-Origin doesn't match: ${headers['access-control-allow-origin']}`);
        testResults.failed.push('Preflight Allow-Origin mismatch');
      }
    } else {
      logError('Access-Control-Allow-Origin header missing');
      testResults.failed.push('Preflight Allow-Origin missing');
    }
    
    if (headers['access-control-allow-credentials'] === 'true') {
      logSuccess('Allow-Credentials: true');
      testResults.passed.push('Preflight Allow-Credentials');
    } else {
      logError('Allow-Credentials not set to true');
      testResults.failed.push('Preflight Allow-Credentials');
    }
    
    if (headers['access-control-allow-methods']) {
      logSuccess(`Allow-Methods: ${headers['access-control-allow-methods']}`);
      testResults.passed.push('Preflight Allow-Methods');
    } else {
      logWarning('Allow-Methods header missing');
      testResults.warnings.push('Preflight Allow-Methods missing');
    }
    
    if (headers['access-control-allow-headers']) {
      logSuccess(`Allow-Headers: ${headers['access-control-allow-headers']}`);
      testResults.passed.push('Preflight Allow-Headers');
    } else {
      logWarning('Allow-Headers header missing');
      testResults.warnings.push('Preflight Allow-Headers missing');
    }
    
  } catch (error) {
    logError(`Preflight request failed: ${error.message}`);
    testResults.failed.push('Preflight request failed');
  }
}

async function testLoginWithCORS() {
  logSection('2. Testing Login API with CORS');
  
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/auth/login`,
      TEST_USER,
      {
        headers: {
          'Origin': FRONTEND_URL,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      }
    );
    
    const headers = response.headers;
    
    // Check CORS headers in actual response
    if (headers['access-control-allow-origin']) {
      logSuccess(`Response Allow-Origin: ${headers['access-control-allow-origin']}`);
      testResults.passed.push('Login CORS headers');
    } else {
      logError('Response missing Allow-Origin header');
      testResults.failed.push('Login CORS headers missing');
    }
    
    if (response.data && response.data.token) {
      logSuccess('Login successful, token received');
      testResults.passed.push('Login functionality');
      return response.data.token;
    } else {
      logError('Login response missing token');
      testResults.failed.push('Login token missing');
      return null;
    }
    
  } catch (error) {
    if (error.response) {
      // Check if it's a CORS error or authentication error
      if (error.response.status === 401) {
        logWarning(`Authentication failed (might need to create test user): ${error.response.data.message}`);
        testResults.warnings.push('Test user authentication');
      } else {
        logError(`Login request failed: ${error.response.status} - ${error.response.data.message}`);
        testResults.failed.push('Login request');
      }
    } else if (error.request) {
      logError('No response received (possible CORS block or network issue)');
      testResults.failed.push('Login CORS blocked');
    } else {
      logError(`Request setup error: ${error.message}`);
      testResults.failed.push('Login request setup');
    }
    return null;
  }
}

async function testAuthenticatedRequest(token) {
  logSection('3. Testing Authenticated API Request');
  
  if (!token) {
    logWarning('Skipping authenticated request test (no token)');
    return;
  }
  
  try {
    const response = await axios.get(
      `${BACKEND_URL}/api/dashboard`,
      {
        headers: {
          'Origin': FRONTEND_URL,
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      }
    );
    
    if (response.status === 200) {
      logSuccess('Authenticated request successful');
      testResults.passed.push('Authenticated API request');
      
      // Check CORS headers
      if (response.headers['access-control-allow-origin']) {
        logSuccess(`Authenticated response has CORS headers`);
        testResults.passed.push('Authenticated CORS headers');
      }
    }
    
  } catch (error) {
    if (error.response && error.response.status === 401) {
      logWarning('Authentication failed (token might be invalid)');
      testResults.warnings.push('Authenticated request auth');
    } else {
      logError(`Authenticated request failed: ${error.message}`);
      testResults.failed.push('Authenticated request');
    }
  }
}

async function testWebSocketConnection(token) {
  logSection('4. Testing WebSocket Connection');
  
  if (!token) {
    logWarning('Skipping WebSocket test (no token)');
    return;
  }
  
  return new Promise((resolve) => {
    logInfo('Attempting WebSocket connection...');
    
    const socket = io(BACKEND_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      extraHeaders: {
        'Origin': FRONTEND_URL
      }
    });
    
    const timeout = setTimeout(() => {
      logError('WebSocket connection timeout (10 seconds)');
      testResults.failed.push('WebSocket connection timeout');
      socket.disconnect();
      resolve();
    }, 10000);
    
    socket.on('connect', () => {
      clearTimeout(timeout);
      logSuccess(`WebSocket connected! Socket ID: ${socket.id}`);
      testResults.passed.push('WebSocket connection');
      
      // Test receiving data
      socket.on('connectionSuccess', (data) => {
        logSuccess(`Received connectionSuccess event: ${JSON.stringify(data)}`);
        testResults.passed.push('WebSocket data reception');
        socket.disconnect();
        resolve();
      });
      
      // Request online users to test bidirectional communication
      socket.emit('requestOnlineUsers');
    });
    
    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      logError(`WebSocket connection error: ${error.message}`);
      
      if (error.message.includes('CORS')) {
        logError('WebSocket CORS error detected');
        testResults.failed.push('WebSocket CORS');
      } else {
        testResults.failed.push('WebSocket connection');
      }
      
      socket.disconnect();
      resolve();
    });
    
    socket.on('error', (error) => {
      clearTimeout(timeout);
      logError(`WebSocket error: ${error}`);
      testResults.failed.push('WebSocket error');
      socket.disconnect();
      resolve();
    });
  });
}

async function testHealthEndpoint() {
  logSection('5. Testing Health Check Endpoint');
  
  try {
    const response = await axios.get(
      `${BACKEND_URL}/health`,
      {
        headers: {
          'Origin': FRONTEND_URL
        }
      }
    );
    
    if (response.status === 200 && response.data.status === 'healthy') {
      logSuccess('Health endpoint accessible');
      testResults.passed.push('Health endpoint');
      
      // Log service statuses
      if (response.data.services) {
        logInfo(`Supabase: ${response.data.services.supabase}`);
        logInfo(`Cache: ${response.data.services.cache}`);
      }
    }
    
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    testResults.failed.push('Health endpoint');
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  log('PRODUCTION CORS & WEBSOCKET VERIFICATION TEST', 'bright');
  console.log('='.repeat(60));
  logInfo(`Frontend URL: ${FRONTEND_URL}`);
  logInfo(`Backend URL: ${BACKEND_URL}`);
  logInfo(`Test User: ${TEST_USER.username}`);
  
  // Run tests in sequence
  await testHealthEndpoint();
  await testPreflightRequest();
  const token = await testLoginWithCORS();
  await testAuthenticatedRequest(token);
  await testWebSocketConnection(token);
  
  // Print summary
  logSection('TEST SUMMARY');
  
  if (testResults.passed.length > 0) {
    log('\nPASSED TESTS:', 'green');
    testResults.passed.forEach(test => logSuccess(test));
  }
  
  if (testResults.warnings.length > 0) {
    log('\nWARNINGS:', 'yellow');
    testResults.warnings.forEach(warning => logWarning(warning));
  }
  
  if (testResults.failed.length > 0) {
    log('\nFAILED TESTS:', 'red');
    testResults.failed.forEach(test => logError(test));
  }
  
  console.log('\n' + '='.repeat(60));
  
  const totalTests = testResults.passed.length + testResults.failed.length;
  const passRate = totalTests > 0 ? 
    Math.round((testResults.passed.length / totalTests) * 100) : 0;
  
  if (testResults.failed.length === 0) {
    log(`✅ ALL TESTS PASSED (${testResults.passed.length}/${totalTests}) - ${passRate}%`, 'green');
    log('🎉 PRODUCTION DEPLOYMENT IS FULLY FUNCTIONAL!', 'green');
  } else if (testResults.passed.length > testResults.failed.length) {
    log(`⚠️  PARTIAL SUCCESS (${testResults.passed.length}/${totalTests} passed) - ${passRate}%`, 'yellow');
    log('Some issues remain, but core functionality may work', 'yellow');
  } else {
    log(`❌ CRITICAL FAILURES (${testResults.passed.length}/${totalTests} passed) - ${passRate}%`, 'red');
    log('Production deployment has severe issues', 'red');
  }
  
  console.log('='.repeat(60) + '\n');
  
  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Check if we can reach the backend at all
async function checkBackendReachability() {
  logInfo('Checking backend reachability...');
  try {
    const response = await axios.get(BACKEND_URL, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status
    });
    logSuccess(`Backend is reachable (status: ${response.status})`);
    return true;
  } catch (error) {
    logError(`Backend is not reachable: ${error.message}`);
    logError('Please ensure the backend is deployed and running');
    return false;
  }
}

// Main execution
(async () => {
  try {
    const isReachable = await checkBackendReachability();
    if (!isReachable) {
      logError('Cannot proceed with tests - backend is unreachable');
      process.exit(1);
    }
    
    await runAllTests();
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
})();