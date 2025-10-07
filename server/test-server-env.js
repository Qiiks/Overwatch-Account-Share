require('dotenv').config();

async function checkServerEnvironment() {
    console.log('\n=== Server Environment Check ===');
    console.log('JWT_SECRET from .env:', process.env.JWT_SECRET);
    
    // Try to get server info
    try {
        const response = await fetch('http://localhost:5001/api/auth/me', {
            headers: {
                'Authorization': 'Bearer invalid_token_to_see_error'
            }
        });
        
        console.log('\nServer response status:', response.status);
        const data = await response.json();
        console.log('Server error:', data);
        
    } catch (error) {
        console.log('Network error:', error.message);
    }
    
    console.log('\n=== Checking if server is using different JWT_SECRET ===');
    console.log('Possible issues:');
    console.log('1. Server was started before JWT_SECRET was set in .env');
    console.log('2. Server is caching old JWT_SECRET value');
    console.log('3. Server needs to be restarted to pick up new .env values');
    
    console.log('\n=== Solution ===');
    console.log('1. Stop the server (Ctrl+C or kill the process)');
    console.log('2. Restart the server: cd server && npm start');
    console.log('3. The server should pick up the current .env values');
}

checkServerEnvironment().then(() => {
    console.log('\n=== Check Complete ===');
    process.exit(0);
});