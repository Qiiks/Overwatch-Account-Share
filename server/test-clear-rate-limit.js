require('dotenv').config();

console.log('=== Rate Limit Information ===');
console.log('The server has rate limiting configured:');
console.log('- Max 5 login attempts per 15 minutes per IP');
console.log('- You have exceeded this limit');
console.log('');
console.log('Solutions:');
console.log('1. Wait 15 minutes for the rate limit to reset');
console.log('2. Restart the server to clear the rate limit memory');
console.log('3. Temporarily increase the rate limit for testing');
console.log('');
console.log('To restart the server:');
console.log('1. Stop the server (Ctrl+C or kill the process)');
console.log('2. Start it again: cd server && npm start');
console.log('');
console.log('The rate limit will be cleared and you can try logging in again.');