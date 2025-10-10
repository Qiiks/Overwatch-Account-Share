/**
 * Playwright diagnostic script to monitor JWT token headers in API requests
 * This will help identify if the Authorization header is being sent correctly
 */

const { chromium } = require('playwright');

async function testJWTHeaders() {
  console.log('Starting JWT Header Diagnostic Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Array to store intercepted requests
  const apiRequests = [];
  
  // Enable request interception to monitor API calls
  page.on('request', request => {
    const url = request.url();
    
    // Monitor all API calls to the backend
    if (url.includes('localhost:5001/api') || url.includes('/api/')) {
      const headers = request.headers();
      const method = request.method();
      
      console.log('\n==== API Request Intercepted ====');
      console.log(`URL: ${url}`);
      console.log(`Method: ${method}`);
      console.log('Headers:');
      console.log(JSON.stringify(headers, null, 2));
      
      // Specifically check for Authorization header
      if (headers['authorization']) {
        console.log(`✅ Authorization header found: ${headers['authorization']}`);
      } else {
        console.log('❌ Authorization header is MISSING!');
      }
      
      apiRequests.push({
        url,
        method,
        headers,
        hasAuth: !!headers['authorization']
      });
      
      console.log('=================================\n');
    }
  });
  
  // Also monitor responses to see if we get 401 errors
  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    
    if (url.includes('localhost:5001/api') || url.includes('/api/')) {
      if (status === 401) {
        console.log(`⚠️  401 Unauthorized response from: ${url}`);
      }
    }
  });
  
  try {
    // Step 1: Navigate to login page
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Step 2: Fill in login credentials
    console.log('Step 2: Filling login form...');
    await page.fill('input[type="email"]', 'gameslayer.inc@gmail.com');
    await page.fill('input[type="password"]', '121212Sanveed');
    
    // Step 3: Submit login
    console.log('Step 3: Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForTimeout(3000);
    
    // Step 4: Check localStorage for token
    console.log('Step 4: Checking localStorage for JWT token...');
    const tokenCheck = await page.evaluate(() => {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('user');
      
      console.log('LocalStorage contents:');
      console.log('auth_token:', token ? token.substring(0, 50) + '...' : 'NOT FOUND');
      console.log('user:', user);
      
      return {
        hasToken: !!token,
        tokenStart: token ? token.substring(0, 50) : null,
        hasUser: !!user
      };
    });
    
    console.log('Token check results:', tokenCheck);
    
    // Step 5: Navigate to admin page to trigger admin API calls
    console.log('\nStep 5: Navigating to admin page...');
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
    
    // Wait for API calls to complete
    await page.waitForTimeout(5000);
    
    // Step 6: Analyze results
    console.log('\n==== ANALYSIS SUMMARY ====');
    console.log(`Total API requests intercepted: ${apiRequests.length}`);
    
    const adminRequests = apiRequests.filter(r => r.url.includes('/admin'));
    console.log(`Admin API requests: ${adminRequests.length}`);
    
    const requestsWithAuth = apiRequests.filter(r => r.hasAuth);
    console.log(`Requests with Authorization header: ${requestsWithAuth.length}`);
    
    const requestsWithoutAuth = apiRequests.filter(r => !r.hasAuth);
    console.log(`Requests WITHOUT Authorization header: ${requestsWithoutAuth.length}`);
    
    if (requestsWithoutAuth.length > 0) {
      console.log('\n❌ PROBLEM IDENTIFIED: The following requests are missing Authorization headers:');
      requestsWithoutAuth.forEach(r => {
        console.log(`  - ${r.method} ${r.url}`);
      });
    }
    
    if (adminRequests.length > 0 && adminRequests.every(r => !r.hasAuth)) {
      console.log('\n🔴 CRITICAL: All admin API requests are missing Authorization headers!');
      console.log('This explains the 401 Unauthorized errors.');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
    console.log('\n==========================');
    console.log('Diagnostic test complete.');
  }
}

// Run the test
testJWTHeaders().catch(console.error);