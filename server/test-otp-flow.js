/**
 * End-to-End OTP Fetching Flow Test
 * 
 * This script tests the complete OTP fetching workflow including:
 * - User authentication
 * - Google account linking
 * - Overwatch account creation
 * - OTP fetching trigger
 * - WebSocket event verification
 * - Cleanup
 */

const fetch = require('node-fetch');
const io = require('socket.io-client');
const readline = require('readline');

// Configuration
const API_BASE_URL = 'http://localhost:5001/api';
const SOCKET_URL = 'http://localhost:5001';
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123!@#',
  username: 'testuser'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function for colored console output
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper function to create readline interface
function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Helper function to wait for user input
function waitForInput(prompt) {
  const rl = createPrompt();
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Test context to store data across test steps
const testContext = {
  authToken: null,
  userId: null,
  googleAccountId: null,
  overwatchAccountId: null,
  socket: null
};

// Step 1: Login or register user
async function authenticateUser() {
  log('\n=== Step 1: User Authentication ===', 'cyan');
  
  try {
    // Try to login first
    log('Attempting to login...', 'blue');
    let response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });

    let data = await response.json();

    if (!response.ok) {
      // If login fails, try to register
      log('Login failed, attempting to register new user...', 'yellow');
      response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER)
      });

      data = await response.json();

      if (!response.ok) {
        throw new Error(`Registration failed: ${data.message || response.statusText}`);
      }

      log('User registered successfully!', 'green');
      
      // Now login with the new user
      response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER.email,
          password: TEST_USER.password
        })
      });

      data = await response.json();
    }

    if (!response.ok) {
      throw new Error(`Login failed: ${data.message || response.statusText}`);
    }

    testContext.authToken = data.token;
    testContext.userId = data.user.id;

    log(`✓ Authentication successful! User ID: ${testContext.userId}`, 'green');
    log(`  Token: ${testContext.authToken.substring(0, 20)}...`, 'blue');
    
    return true;
  } catch (error) {
    log(`✗ Authentication failed: ${error.message}`, 'red');
    return false;
  }
}

// Step 2: Check and link Google Account
async function linkGoogleAccount() {
  log('\n=== Step 2: Google Account Linking ===', 'cyan');
  
  try {
    // First, check if user has any linked Google accounts
    log('Checking for existing linked Google accounts...', 'blue');
    
    const response = await fetch(`${API_BASE_URL}/google-auth/linked-accounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testContext.authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const accounts = await response.json();
      
      if (accounts && accounts.length > 0) {
        log(`✓ Found ${accounts.length} linked Google account(s)`, 'green');
        testContext.googleAccountId = accounts[0].id;
        log(`  Using account: ${accounts[0].email} (ID: ${accounts[0].id})`, 'blue');
        return true;
      }
    }

    // No linked accounts found, initiate OAuth flow
    log('No linked Google accounts found. Initiating OAuth flow...', 'yellow');
    
    // Get OAuth URL
    const authUrlResponse = await fetch(`${API_BASE_URL}/google-auth/otp/init`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testContext.authToken}`
      }
    });

    if (!authUrlResponse.ok) {
      throw new Error('Failed to get OAuth URL');
    }

    const { authUrl } = await authUrlResponse.json();
    
    log('\n⚠️  Manual Action Required:', 'yellow');
    log('1. Open this URL in your browser:', 'yellow');
    log(`   ${authUrl}`, 'blue');
    log('2. Complete the Google OAuth flow', 'yellow');
    log('3. After authorization, you will be redirected', 'yellow');
    
    await waitForInput('\nPress Enter after completing the OAuth flow...');
    
    // Check again for linked accounts
    const checkResponse = await fetch(`${API_BASE_URL}/google-auth/linked-accounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testContext.authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (checkResponse.ok) {
      const accounts = await checkResponse.json();
      if (accounts && accounts.length > 0) {
        testContext.googleAccountId = accounts[0].id;
        log(`✓ Google account linked successfully: ${accounts[0].email}`, 'green');
        return true;
      }
    }

    throw new Error('Google account linking failed');
  } catch (error) {
    log(`✗ Google account linking failed: ${error.message}`, 'red');
    return false;
  }
}

// Step 3: Add Overwatch Account
async function addOverwatchAccount() {
  log('\n=== Step 3: Add Overwatch Account ===', 'cyan');
  
  try {
    const overwatchAccount = {
      battletag: `TestAccount#${Date.now() % 10000}`,
      email: 'test-ow@example.com',
      password: 'TestPassword123!',
      rank: 'Diamond',
      mainHeroes: ['Genji', 'Mercy'],
      otpGmailAccountId: testContext.googleAccountId
    };

    log(`Creating Overwatch account: ${overwatchAccount.battletag}`, 'blue');

    const response = await fetch(`${API_BASE_URL}/overwatch-accounts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(overwatchAccount)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to add account: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    testContext.overwatchAccountId = data.account.id;
    testContext.overwatchAccountTag = data.account.accountTag;

    log(`✓ Overwatch account created successfully!`, 'green');
    log(`  Account ID: ${testContext.overwatchAccountId}`, 'blue');
    log(`  Battletag: ${testContext.overwatchAccountTag}`, 'blue');
    
    return true;
  } catch (error) {
    log(`✗ Failed to add Overwatch account: ${error.message}`, 'red');
    return false;
  }
}

// Step 4: Setup WebSocket listener
async function setupWebSocketListener() {
  log('\n=== Step 4: Setup WebSocket Listener ===', 'cyan');
  
  return new Promise((resolve) => {
    try {
      // Connect to WebSocket server
      testContext.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true
      });

      testContext.socket.on('connect', () => {
        log('✓ Connected to WebSocket server', 'green');
        log(`  Socket ID: ${testContext.socket.id}`, 'blue');
      });

      testContext.socket.on('otp', (data) => {
        log('\n📨 OTP Event Received!', 'green');
        log(`  Account: ${data.accountTag}`, 'blue');
        log(`  OTP: ${data.otp}`, 'yellow');
        
        // Verify OTP format (should be 6 digits)
        if (/^\d{6}$/.test(data.otp)) {
          log('✓ OTP format is valid (6 digits)', 'green');
        } else {
          log('⚠️  OTP format may be invalid', 'yellow');
        }

        // Store OTP for verification
        testContext.receivedOTP = data.otp;
      });

      testContext.socket.on('error', (error) => {
        log(`WebSocket error: ${error}`, 'red');
      });

      // Give socket time to establish connection
      setTimeout(() => {
        resolve(true);
      }, 1000);
    } catch (error) {
      log(`✗ Failed to setup WebSocket: ${error.message}`, 'red');
      resolve(false);
    }
  });
}

// Step 5: Trigger OTP Fetch
async function triggerOTPFetch() {
  log('\n=== Step 5: Trigger OTP Fetch ===', 'cyan');
  
  try {
    log('Manually triggering OTP fetch service...', 'blue');
    
    // First, let's check if there's an endpoint to trigger OTP fetch
    // If not, we'll need to wait for the scheduled fetch
    
    const response = await fetch(`${API_BASE_URL}/google-auth/trigger-otp-fetch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accountId: testContext.overwatchAccountId
      })
    });

    if (response.ok) {
      log('✓ OTP fetch triggered successfully', 'green');
    } else {
      log('⚠️  Manual trigger endpoint not available, waiting for scheduled fetch...', 'yellow');
      log('  OTP service runs every 30 seconds', 'blue');
    }

    // Wait for OTP to be received via WebSocket
    log('\nWaiting for OTP event (max 60 seconds)...', 'blue');
    
    await new Promise((resolve) => {
      let timeout = setTimeout(() => {
        if (!testContext.receivedOTP) {
          log('⚠️  Timeout: No OTP received within 60 seconds', 'yellow');
        }
        resolve();
      }, 60000);

      // Check periodically if OTP was received
      const checkInterval = setInterval(() => {
        if (testContext.receivedOTP) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });

    if (testContext.receivedOTP) {
      log('✓ OTP successfully received and verified!', 'green');
      return true;
    } else {
      log('✗ No OTP received', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Failed to trigger OTP fetch: ${error.message}`, 'red');
    return false;
  }
}

// Step 6: Cleanup
async function cleanup() {
  log('\n=== Step 6: Cleanup ===', 'cyan');
  
  try {
    // Delete the created Overwatch account
    if (testContext.overwatchAccountId) {
      log('Deleting test Overwatch account...', 'blue');
      
      const response = await fetch(`${API_BASE_URL}/overwatch-accounts/${testContext.overwatchAccountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${testContext.authToken}`
        }
      });

      if (response.ok) {
        log('✓ Test Overwatch account deleted', 'green');
      } else {
        log('⚠️  Failed to delete test account', 'yellow');
      }
    }

    // Disconnect WebSocket
    if (testContext.socket) {
      testContext.socket.disconnect();
      log('✓ WebSocket disconnected', 'green');
    }

    return true;
  } catch (error) {
    log(`✗ Cleanup failed: ${error.message}`, 'red');
    return false;
  }
}

// Main test runner
async function runTest() {
  log('\n' + '='.repeat(50), 'cyan');
  log('     OTP FETCHING END-TO-END TEST', 'cyan');
  log('='.repeat(50), 'cyan');
  
  const steps = [
    { name: 'Authentication', fn: authenticateUser },
    { name: 'Google Account Linking', fn: linkGoogleAccount },
    { name: 'Add Overwatch Account', fn: addOverwatchAccount },
    { name: 'Setup WebSocket', fn: setupWebSocketListener },
    { name: 'Trigger OTP Fetch', fn: triggerOTPFetch },
    { name: 'Cleanup', fn: cleanup }
  ];

  const results = {
    passed: 0,
    failed: 0,
    total: steps.length
  };

  for (const step of steps) {
    const success = await step.fn();
    if (success) {
      results.passed++;
    } else {
      results.failed++;
      // Continue with cleanup even if other steps fail
      if (step.name !== 'Cleanup') {
        log(`\n⚠️  Skipping remaining tests due to failure in ${step.name}`, 'yellow');
        // Still run cleanup
        await cleanup();
        break;
      }
    }
  }

  // Print summary
  log('\n' + '='.repeat(50), 'cyan');
  log('                TEST SUMMARY', 'cyan');
  log('='.repeat(50), 'cyan');
  log(`Total Steps: ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  
  if (results.failed === 0) {
    log('\n✓ All tests passed successfully!', 'green');
  } else {
    log('\n✗ Some tests failed. Check the output above for details.', 'red');
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Error handling
process.on('unhandledRejection', (error) => {
  log(`\nUnhandled rejection: ${error.message}`, 'red');
  if (testContext.socket) {
    testContext.socket.disconnect();
  }
  process.exit(1);
});

process.on('SIGINT', async () => {
  log('\n\nTest interrupted by user', 'yellow');
  await cleanup();
  process.exit(0);
});

// Run the test
runTest().catch((error) => {
  log(`\nTest runner error: ${error.message}`, 'red');
  process.exit(1);
});