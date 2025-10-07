require('dotenv').config();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

async function testJWTVerification() {
    console.log('\n=== JWT Verification Test ===');
    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
    
    try {
        // Get a real user
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .limit(1);
            
        if (error || !users || users.length === 0) {
            console.log('No users found');
            return;
        }
        
        const user = users[0];
        console.log('\nUser found:', {
            id: user.id,
            email: user.email,
            username: user.username
        });
        
        // Create a token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                username: user.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        console.log('\nToken created:', token);
        
        // Verify the token
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('\nToken verification SUCCESS');
            console.log('Decoded:', decoded);
        } catch (verifyError) {
            console.log('\nToken verification FAILED:', verifyError.message);
        }
        
        // Now let's simulate what the middleware does
        console.log('\n=== Simulating Middleware ===');
        
        // 1. Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Step 1: JWT verified, user id:', decoded.id);
        
        // 2. Fetch user from database
        const { data: dbUser, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.id)
            .single();
            
        if (dbError) {
            console.log('Step 2: Database error:', dbError);
        } else if (!dbUser) {
            console.log('Step 2: User not found in database');
        } else {
            console.log('Step 2: User found in database:', {
                id: dbUser.id,
                email: dbUser.email,
                username: dbUser.username,
                role: dbUser.role,
                isadmin: dbUser.isadmin
            });
        }
        
        // Test with actual API call
        console.log('\n=== Testing Actual API Call ===');
        const response = await fetch('http://localhost:5001/api/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('API Response Status:', response.status, response.statusText);
        if (!response.ok) {
            const error = await response.json();
            console.log('API Error:', error);
        }
        
    } catch (error) {
        console.error('Test error:', error);
    }
}

testJWTVerification().then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});