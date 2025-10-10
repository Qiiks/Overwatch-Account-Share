/**
 * Email Normalization Utility
 * 
 * Provides functions for normalizing Gmail addresses and detecting Gmail variants.
 * Gmail addresses ignore dots in the username and support plus addressing (+alias).
 * This utility helps identify when different email addresses actually belong to
 * the same Gmail account.
 */

/**
 * Normalizes an email address by removing Gmail-specific variations.
 * For Gmail addresses, removes all dots from the username part and strips plus addressing.
 * For non-Gmail addresses, returns the original email unchanged.
 * 
 * @param {string} email - The email address to normalize
 * @returns {string} The normalized email address
 * 
 * @example
 * getNormalizedEmail('john.doe+battlenet@gmail.com') // returns 'johndoe@gmail.com'
 * getNormalizedEmail('user.name@outlook.com') // returns 'user.name@outlook.com'
 */
function getNormalizedEmail(email) {
  // Handle null, undefined, or non-string inputs
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Convert to lowercase for case-insensitive comparison
  const lowerEmail = email.toLowerCase().trim();
  
  // Split email into username and domain parts
  const atIndex = lowerEmail.lastIndexOf('@');
  if (atIndex === -1) {
    // Invalid email format, return as-is
    return lowerEmail;
  }
  
  const username = lowerEmail.substring(0, atIndex);
  const domain = lowerEmail.substring(atIndex + 1);
  
  // Check if it's a Gmail address (also handles googlemail.com which is equivalent)
  const isGmail = domain === 'gmail.com' || domain === 'googlemail.com';
  
  if (!isGmail) {
    // Not a Gmail address, return the original (lowercase)
    return lowerEmail;
  }
  
  // For Gmail addresses, process the username
  let normalizedUsername = username;
  
  // Remove plus addressing (everything after and including the + sign)
  const plusIndex = normalizedUsername.indexOf('+');
  if (plusIndex !== -1) {
    normalizedUsername = normalizedUsername.substring(0, plusIndex);
  }
  
  // Remove all dots from the username (Gmail ignores dots)
  normalizedUsername = normalizedUsername.replace(/\./g, '');
  
  // Reconstruct the normalized email
  // Always use gmail.com even if original was googlemail.com for consistency
  return `${normalizedUsername}@gmail.com`;
}

/**
 * Checks if two email addresses are variants of the same Gmail account.
 * Returns true if both emails normalize to the same base Gmail address.
 * 
 * @param {string} email1 - The first email address
 * @param {string} email2 - The second email address
 * @returns {boolean} True if the emails are Gmail variants, false otherwise
 * 
 * @example
 * areGmailVariants('john.doe@gmail.com', 'johndoe+work@gmail.com') // returns true
 * areGmailVariants('user@gmail.com', 'user@outlook.com') // returns false
 */
function areGmailVariants(email1, email2) {
  // Handle invalid inputs
  if (!email1 || !email2 || typeof email1 !== 'string' || typeof email2 !== 'string') {
    return false;
  }
  
  // Get normalized versions of both emails
  const normalized1 = getNormalizedEmail(email1);
  const normalized2 = getNormalizedEmail(email2);
  
  // If either email is not a Gmail address after normalization, they can't be Gmail variants
  if (!normalized1.endsWith('@gmail.com') || !normalized2.endsWith('@gmail.com')) {
    return false;
  }
  
  // Compare the normalized versions
  return normalized1 === normalized2;
}

/**
 * Extracts the plus alias from an email address if it uses plus addressing.
 * Returns the alias part (text after the + sign) or null if no plus addressing is used.
 * 
 * @param {string} email - The email address to extract the alias from
 * @returns {string|null} The alias part if present, null otherwise
 * 
 * @example
 * extractPlusAlias('user+battlenet@gmail.com') // returns 'battlenet'
 * extractPlusAlias('user@gmail.com') // returns null
 * extractPlusAlias('user+work+home@gmail.com') // returns 'work+home'
 */
function extractPlusAlias(email) {
  // Handle invalid inputs
  if (!email || typeof email !== 'string') {
    return null;
  }
  
  // Convert to lowercase and trim
  const lowerEmail = email.toLowerCase().trim();
  
  // Find the @ symbol to identify the username part
  const atIndex = lowerEmail.indexOf('@');
  if (atIndex === -1) {
    // Invalid email format
    return null;
  }
  
  const username = lowerEmail.substring(0, atIndex);
  
  // Find the plus sign in the username
  const plusIndex = username.indexOf('+');
  if (plusIndex === -1) {
    // No plus addressing used
    return null;
  }
  
  // Extract the alias part (everything after the + but before the @)
  const alias = username.substring(plusIndex + 1);
  
  // Return the alias or null if it's empty
  return alias.length > 0 ? alias : null;
}

// Export the functions
module.exports = {
  getNormalizedEmail,
  areGmailVariants,
  extractPlusAlias
};