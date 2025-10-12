require('dotenv').config();

console.log('ENCRYPTION_SECRET exists:', !!process.env.ENCRYPTION_SECRET);
console.log('ENCRYPTION_SECRET length:', process.env.ENCRYPTION_SECRET?.length || 0);

// Test decryption
const { decrypt } = require('./utils/encryption');

// Sample encrypted accountTag from logs (if user has one)
const sampleEncrypted = 'f8a3b2c1d4e5f6a7b8c9d0e1:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6:e1f2a3b4c5d6a7b8c9d0e1f2';

console.log('\nTesting decryption:');
try {
  const decrypted = decrypt(sampleEncrypted);
  console.log('✓ Decryption works, result:', decrypted);
} catch (error) {
  console.log('✗ Decryption test failed:', error.message);
}

process.exit(0);