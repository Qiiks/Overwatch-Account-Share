require('dotenv').config();
const crypto = require('crypto');

// Test the provided secret
const testSecret = 'k7X9mN2pQ5wR8tB3vF6zL4jH1sG0dA7c';

// Create decrypt function with the test secret
const algorithm = 'aes-256-gcm';
const secretKey = crypto.createHash('sha256').update(String(testSecret)).digest();

function testDecrypt(encryptedText) {
  if (!encryptedText) return null;
  
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Test with actual encrypted data from database
const encryptedSamples = [
  'a6ff3c424a441497e17c9bb4fbfb4931:0ec7e95ff0138b6f97491a3c53140d24:8930ab71e6e1d5',
  '02749940ddffd346aded029e1d2416c2:47b64767ed716e46ac89aa5b8fc88149:5df3f3d59eb395'
];

console.log('Testing secret:', testSecret);
console.log('Secret length:', testSecret.length);
console.log('\nTesting decryption with provided secret:\n');

encryptedSamples.forEach((sample, index) => {
  try {
    const decrypted = testDecrypt(sample);
    console.log(`Sample ${index + 1}: ✓ SUCCESS`);
    console.log(`  Decrypted value: "${decrypted}"`);
  } catch (error) {
    console.log(`Sample ${index + 1}: ✗ FAILED`);
    console.log(`  Error: ${error.message}`);
  }
  console.log();
});

process.exit(0);