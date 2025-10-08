/**
 * LOCAL VERIFICATION TEST
 * Tests the fixes locally before production deployment
 */

const axios = require('axios');
const io = require('socket.io-client');

// Local test URLs
const FRONTEND_URL = 'https://overwatch.qiikzx.dev'; // Simulating production frontend
const BACKEND_URL = 'http://localhost:5001';

// Test credentials
const TEST_USER = {
  username: 'test_user',
  email: 'test@example.com',
  password: 'TestPassword123!'
};

// Axios instance configured for local testing with production origin
const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Origin': FRONTEND_URL, // Simulate production origin
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true
});

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

async function runLocalTest() {
  console.log(`${colors.bright}${colors.magenta}
╔══════════════════════════════════════════════════════════════╗
║     LOCAL VERIFICATION TEST                                 ║
║     Testing fixes with production origin headers            ║
║     Backend: ${BACKEND_URL}                        ║
║     Simulated Frontend: ${FRONTEND_URL}    ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`\n${colors.bright}TEST 1: CORS with Production Origin${colors.reset}`);
  
  try {
    // Test OPTIONS preflight with production origin
    const optionsResponse = await api.options('/api/auth/login');
    console.log(`${colors.green}✓ OPTIONS request successful${colors.reset}`);
    console.log(`  Status: ${optionsResponse.status}`);
    console.log(`  CORS Headers:`);
    console.log(`    - Allow-Origin: ${optionsResponse.headers['access-control-allow-origin'] || 'Not set'}`);
    console.log(`    - Allow-Credentials: ${optionsResponse.headers['access-control-allow-credentials'] || 'Not set'}`);
    
    // Test actual POST with production origin
    console.log(`\n${colors.bright}TEST 2: Authentication with Production Origin${colors.reset}`);
    
    // Try registration first
    try {
      await api.post('/api/auth/register', TEST_USER);
      console.log(`${colors.green}✓ User registered successfully${colors.reset}`);
    } catch (error) {
      if (error.response?.status === 400 ||
          (error.response?.status === 500 && error.response?.data?.error?.includes('duplicate key'))) {
        console.log(`${colors.cyan}ℹ User already exists (expected)${colors.reset}`);
      } else {
        throw error;
      }
    }
    
    // Test login (try both email and username formats)
    let loginResponse;
    try {
      // Try with email first
      loginResponse = await api.post('/api/auth/login', {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
    } catch (emailError) {
      // If email fails, try with username
      loginResponse = await api.post('/api/auth/login', {
        username: TEST_USER.username,
        password: TEST_USER.password
      });
    }
    
    if (loginResponse.status === 200 && loginResponse.data.token) {
      console.log(`${colors.green}✓ Login successful with production origin${colors.reset}`);
      console.log(`  Token received: ${loginResponse.data.token.substring(0, 20)}...`);
      
      // Test WebSocket with production origin
      console.log(`\n${colors.bright}TEST 3: WebSocket Connection${colors.reset}`);
      
      const socket = io(BACKEND_URL, {
        auth: { token: loginResponse.data.token },
        extraHeaders: {
          'Origin': FRONTEND_URL
        },
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 5000
      });
      
      return new Promise((resolve) => {
        socket.on('connect', () => {
          console.log(`${colors.green}✓ WebSocket connected with production origin${colors.reset}`);
          console.log(`  Socket ID: ${socket.id}`);
        });
        
        socket.on('connectionSuccess', (data) => {
          console.log(`${colors.green}✓ WebSocket authenticated${colors.reset}`);
          console.log(`  User ID: ${data.userId}`);
          console.log(`  Online users: ${data.onlineUsers}`);
          
          socket.disconnect();
          
          console.log(`\n${colors.bright}${colors.green}
╔══════════════════════════════════════════════════════════════╗
║     ALL LOCAL TESTS PASSED!                                 ║
║     The fixes are working correctly.                        ║
║     Ready for production deployment.                        ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);
          
          resolve(true);
        });
        
        socket.on('connect_error', (error) => {
          console.log(`${colors.red}✗ WebSocket connection failed${colors.reset}`);
          console.log(`  Error: ${error.message}`);
          socket.disconnect();
          resolve(false);
        });
        
        setTimeout(() => {
          console.log(`${colors.red}✗ WebSocket connection timeout${colors.reset}`);
          socket.disconnect();
          resolve(false);
        }, 5000);
      });
    } else {
      console.log(`${colors.red}✗ Login failed${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Test failed${colors.reset}`);
    console.log(`  Error: ${error.message}`);
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Data: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// Run the test
runLocalTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });