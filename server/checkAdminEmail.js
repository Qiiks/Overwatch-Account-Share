const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
const User = require('./models/User');

// Import database connection
const { connectDB } = require('./config/db');

// Function to check admin email
const checkAdminEmail = async () => {
  try {
    console.log('\n=== Checking Admin Email in Database ===\n');
    
    // Connect to database
    await connectDB();
    
    console.log('Connected to database successfully');
    
    // Find all admin users
    const adminUsers = await User.find({ isAdmin: true });
    
    if (adminUsers.length === 0) {
      console.log('No admin users found in the database');
    } else {
      console.log(`Found ${adminUsers.length} admin user(s):`);
      console.log('=====================================');
      
      adminUsers.forEach((user, index) => {
        console.log(`\nAdmin User ${index + 1}:`);
        console.log(`ID: ${user._id}`);
        console.log(`Username: ${user.username}`);
        console.log(`Email: "${user.email}"`);
        console.log(`Email length: ${user.email.length}`);
        console.log(`Email trimmed: "${user.email.trim()}"`);
        console.log(`Email lowercase: "${user.email.toLowerCase()}"`);
        console.log(`Is Admin: ${user.isAdmin}`);
        console.log(`Is Approved: ${user.isApproved}`);
        console.log(`Created At: ${user.createdAt}`);
        console.log('-------------------------------------');
      });
    }
    
    // Also check for any user with email containing 'gameslayer'
    const gameslayerUsers = await User.find({ 
      email: { $regex: 'gameslayer', $options: 'i' } 
    });
    
    if (gameslayerUsers.length > 0) {
      console.log(`\n\nFound ${gameslayerUsers.length} user(s) with 'gameslayer' in email:`);
      console.log('=====================================================');
      
      gameslayerUsers.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log(`ID: ${user._id}`);
        console.log(`Username: ${user.username}`);
        console.log(`Email: "${user.email}"`);
        console.log(`Email length: ${user.email.length}`);
        console.log(`Is Admin: ${user.isAdmin}`);
        console.log(`Is Approved: ${user.isApproved}`);
        console.log('-------------------------------------');
      });
    } else {
      console.log('\nNo users found with "gameslayer" in email');
    }
    
    // Close database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking admin email:', error.message);
    process.exit(1);
  }
};

// Run the function
checkAdminEmail();