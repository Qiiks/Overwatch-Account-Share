const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndCreateUser() {
  console.log('\n=== Checking Production Database ===\n');
  
  try {
    // Check if admin user exists
    console.log('Looking for admin@admin.com user...');
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@admin.com')
      .single();
    
    if (existingUser) {
      console.log('✓ User found:');
      console.log('  ID:', existingUser.id);
      console.log('  Username:', existingUser.username);
      console.log('  Email:', existingUser.email);
      console.log('  Is Admin:', existingUser.isadmin);
      console.log('  Is Approved:', existingUser.isapproved);
      console.log('  Has Password Hash:', !!existingUser.password_hash);
      
      // Update password to ensure it's correct
      console.log('\nUpdating password to ensure it matches "123123"...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123123', salt);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          password_hash: hashedPassword,
          isapproved: true,
          isadmin: true
        })
        .eq('id', existingUser.id);
      
      if (updateError) {
        console.error('✗ Failed to update password:', updateError);
      } else {
        console.log('✓ Password updated successfully!');
        console.log('  You can now login with:');
        console.log('  Email: admin@admin.com');
        console.log('  Password: 123123');
      }
    } else {
      console.log('✗ User not found. Creating admin user...');
      
      // Create the admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123123', salt);
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          username: 'admin',
          email: 'admin@admin.com',
          password_hash: hashedPassword,
          role: 'admin',
          isadmin: true,
          isapproved: true
        })
        .select()
        .single();
      
      if (createError) {
        console.error('✗ Failed to create user:', createError);
        
        // If unique constraint error, try to list all users
        if (createError.code === '23505') {
          console.log('\nListing all users in database:');
          const { data: allUsers, error: listError } = await supabase
            .from('users')
            .select('id, username, email, isadmin, isapproved');
          
          if (allUsers) {
            console.table(allUsers);
          }
        }
      } else {
        console.log('✓ Admin user created successfully!');
        console.log('  ID:', newUser.id);
        console.log('  Username:', newUser.username);
        console.log('  Email:', newUser.email);
        console.log('  You can now login with:');
        console.log('  Email: admin@admin.com');
        console.log('  Password: 123123');
      }
    }
    
    // Test the password directly
    console.log('\n=== Testing Password Hash ===');
    const { data: testUser, error: testError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('email', 'admin@admin.com')
      .single();
    
    if (testUser && testUser.password_hash) {
      const isValid = await bcrypt.compare('123123', testUser.password_hash);
      console.log('Password "123123" validation:', isValid ? '✓ VALID' : '✗ INVALID');
      
      if (!isValid) {
        console.log('Hash in database:', testUser.password_hash.substring(0, 20) + '...');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkAndCreateUser();