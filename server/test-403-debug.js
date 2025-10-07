require('dotenv').config();

async function test403Issue() {
    console.log('\n=== Debugging 403 Forbidden Issue ===');
    
    const testData = {
        email: 'gameslayer.inc@gmail.com',
        password: 'Test123!@#'  // Replace with actual password
    };
    
    try {
        console.log('\nAttempting login...');
        const response = await fetch('http://localhost:5001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-For': '192.168.1.100',  // Try different IP
                'X-Real-IP': '192.168.1.100'
            },
            body: JSON.stringify(testData)
        });
        
        console.log('Response Status:', response.status, response.statusText);
        console.log('Response Headers:');
        console.log('  RateLimit-Limit:', response.headers.get('RateLimit-Limit'));
        console.log('  RateLimit-Remaining:', response.headers.get('RateLimit-Remaining'));
        console.log('  RateLimit-Reset:', response.headers.get('RateLimit-Reset'));
        
        const data = await response.json();
        console.log('Response Body:', data);
        
        if (response.status === 403) {
            console.log('\n=== Possible Causes of 403 ===');
            console.log('1. Rate limit still active (check RateLimit headers above)');
            console.log('2. IP-based blocking');
            console.log('3. Other middleware intercepting the request');
            console.log('4. User account might be blocked/unapproved');
            
            console.log('\n=== Solution ===');
            console.log('The rate limiter uses in-memory storage by IP address.');
            console.log('Even after restart, if you made requests quickly, you might hit the limit again.');
            console.log('');
            console.log('Try ONE of these:');
            console.log('1. Wait a moment and try again (rate limit resets every 15 min)');
            console.log('2. Clear browser cookies and cache');
            console.log('3. Try from a different browser or incognito mode');
            console.log('4. Use a different IP (mobile hotspot, VPN, etc.)');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

test403Issue().then(() => {
    console.log('\n=== Debug Complete ===');
    process.exit(0);
});