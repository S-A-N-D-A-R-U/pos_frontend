/**
 * Cryptographically hashes a string using SHA-256.
 * Uses the browser's native Web Crypto API.
 * 
 * @param {string} message - The plaintext password to hash
 * @returns {Promise<string>} - The hex representation of the SHA-256 hash
 */
export async function hashPassword(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
