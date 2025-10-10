// Load environment variables
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Simulate production environment variables
console.log('=== SIMULATING PRODUCTION ENVIRONMENT ===');
console.log('Setting FRONTEND_URL and ALLOWED_ORIGINS to test production scenario...\n');

// Test different scenarios
const scenarios = [
  {
    name: 'Scenario 1: Empty FRONTEND_URL',
    FRONTEND_URL: '',
    ALLOWED_ORIGINS: ''
  },
  {
    name: 'Scenario 2: FRONTEND_URL with trailing slash',
    FRONTEND_URL: 'https://overwatch.qiikzx.dev/',
    ALLOWED_ORIGINS: ''
  },
  {
    name: 'Scenario 3: Incorrect FRONTEND_URL',
    FRONTEND_URL: 'http://overwatch.qiikzx.dev',
    ALLOWED_ORIGINS: ''
  },
  {
    name: 'Scenario 4: Correct FRONTEND_URL',
    FRONTEND_URL: 'https://overwatch.qiikzx.dev',
    ALLOWED_ORIGINS: ''
  },
  {
    name: 'Scenario 5: With ALLOWED_ORIGINS',
    FRONTEND_URL: 'https://overwatch.qiikzx.dev',
    ALLOWED_ORIGINS: 'https://admin.qiikzx.dev,https://api.qiikzx.dev'
  }
];

scenarios.forEach(scenario => {
  console.log(`\n=== ${scenario.name} ===`);
  console.log(`FRONTEND_URL: "${scenario.FRONTEND_URL}"`);
  console.log(`ALLOWED_ORIGINS: "${scenario.ALLOWED_ORIGINS}"`);
  
  // Override environment variables for this test
  process.env.FRONTEND_URL = scenario.FRONTEND_URL;
  process.env.ALLOWED_ORIGINS = scenario.ALLOWED_ORIGINS;
  
  // Replicate the CORS configuration logic from server.js
  const defaultAllowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://localhost:5001',
    'http://localhost:5173',
    'https://overwatch.qiikzx.dev',
    'https://bwgg4wow8kggc48kko0g080c.qiikzx.dev'
  ];

  const configuredOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
  ]
    .map(origin => (origin || '').trim())
    .filter(Boolean);

  const normalizeOrigin = (origin) => {
    if (!origin) return null;
    try {
      const url = new URL(origin);
      const base = `${url.protocol}//${url.host}`;
      return base.replace(/\/$/, '');
    } catch (err) {
      return origin.replace(/\/$/, '');
    }
  };

  const addProtocolVariants = (origin) => {
    const normalized = normalizeOrigin(origin);
    if (!normalized) return [];
    const variants = new Set([normalized]);
    if (normalized.startsWith('http://')) {
      variants.add(normalized.replace('http://', 'https://'));
    } else if (normalized.startsWith('https://')) {
      variants.add(normalized.replace('https://', 'http://'));
    }
    return Array.from(variants);
  };

  const allowedOrigins = Array.from(new Set([
    ...defaultAllowedOrigins.flatMap(addProtocolVariants),
    ...configuredOrigins.flatMap(addProtocolVariants)
  ]))
    .map(origin => normalizeOrigin(origin))
    .filter(Boolean);

  const allowedOriginsSet = new Set(allowedOrigins);

  // Check if production URL is allowed
  const productionUrl = 'https://overwatch.qiikzx.dev';
  const isAllowed = allowedOriginsSet.has(productionUrl);
  
  console.log(`✓ Production URL (${productionUrl}) allowed: ${isAllowed ? '✅ YES' : '❌ NO'}`);
  
  if (!isAllowed) {
    console.log('  Origins in set:');
    Array.from(allowedOriginsSet).forEach(origin => {
      if (origin.includes('qiikzx.dev')) {
        console.log(`    - ${origin}`);
      }
    });
  }
});

console.log('\n=== RECOMMENDATION ===');
console.log('The production URLs are hardcoded in defaultAllowedOrigins, so they should always work.');
console.log('If CORS is still failing in production, check:');
console.log('1. Is the production server running the latest code?');
console.log('2. Are there any reverse proxies modifying the Origin header?');
console.log('3. Is there a typo in the production environment variables?');
console.log('4. Check the actual Origin header being sent from the browser in production.');