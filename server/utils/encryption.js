const crypto = require('crypto');

// Encryption configuration
const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_SECRET ? 
  crypto.createHash('sha256').update(String(process.env.ENCRYPTION_SECRET)).digest() :
  crypto.createHash('sha256').update('default-secret-key').digest();

/**
 * Encrypts text using AES-256-GCM
 * @param {string} text - The text to encrypt
 * @returns {string} - The encrypted text with iv and authTag
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts text encrypted with AES-256-GCM
 * @param {string} encryptedText - The encrypted text with iv and authTag
 * @returns {string} - The decrypted text
 */
function decrypt(encryptedText) {
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

module.exports = {
  encrypt,
  decrypt
};