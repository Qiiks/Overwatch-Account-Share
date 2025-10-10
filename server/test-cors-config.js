// Load environment variables
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

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

// Diagnostic output
console.log('=== CORS Configuration Diagnostic ===\n');

console.log('Environment Variables:');
console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || '(not set)');
console.log('  ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS || '(not set)');
console.log('');

console.log('Default Allowed Origins:');
defaultAllowedOrigins.forEach(origin => {
  console.log(`  - ${origin}`);
});
console.log('');

console.log('Configured Origins from Environment:');
if (configuredOrigins.length > 0) {
  configuredOrigins.forEach(origin => {
    console.log(`  - ${origin}`);
  });
} else {
  console.log('  (none)');
}
console.log('');

console.log('Final Allowed Origins Set (after normalization):');
Array.from(allowedOriginsSet).forEach(origin => {
  console.log(`  - ${origin}`);
});
console.log('');

// Critical check
const productionUrl = 'https://overwatch.qiikzx.dev';
const isProductionUrlAllowed = allowedOriginsSet.has(productionUrl);

console.log('=== Production URL Check ===');
console.log(`Is "${productionUrl}" in allowed origins?`, isProductionUrlAllowed);
console.log('');

// Test the normalization of production URL
console.log('Normalization test for production URL:');
console.log(`  Original: ${productionUrl}`);
console.log(`  Normalized: ${normalizeOrigin(productionUrl)}`);
console.log(`  Protocol variants: ${JSON.stringify(addProtocolVariants(productionUrl))}`);
console.log('');

// Test what happens with the actual origin check
const testOrigin = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);
  const isAllowed = normalizedOrigin && allowedOriginsSet.has(normalizedOrigin);
  return { origin, normalized: normalizedOrigin, allowed: isAllowed };
};

console.log('=== Origin Check Simulation ===');
const testOrigins = [
  'https://overwatch.qiikzx.dev',
  'http://overwatch.qiikzx.dev',
  'https://overwatch.qiikzx.dev/',
  'https://bwgg4wow8kggc48kko0g080c.qiikzx.dev'
];

testOrigins.forEach(origin => {
  const result = testOrigin(origin);
  console.log(`  ${origin}:`);
  console.log(`    Normalized: ${result.normalized}`);
  console.log(`    Allowed: ${result.allowed}`);
});