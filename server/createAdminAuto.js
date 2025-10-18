/*
 * This script automatically creates an admin user with predefined credentials.
 * It should be run directly from the command line.
 * 
 * Usage: node createAdminAuto.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import User model
const User = require('./models/User');

// Import database connection
const { connectDB } = require('./config/db');

// Validate environment variables
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error('ERROR: Missing required environment variables');
  console.error('Please set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file');
  console.error('Example:');
  console.error('  ADMIN_EMAIL=admin@example.com');
  console.error('  ADMIN_PASSWORD=your-secure-password');
  process.exit(1);
}

// Admin credentials from environment variables
const adminCredentials = {
  username: 'Qiikzx',
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD
};

// Function to create admin user
const createAdmin = async () => {
  try {
    console.log('\n=== Admin User Creation (Automatic) ===\n');
    console.log('This script will automatically create an admin user with the following credentials:');
    console.log(`Username: ${adminCredentials.username}`);
    console.log(`Email: ${adminCredentials.email}`);
    console.log(`Password: ${adminCredentials.password}\n`);
    
    // Connect to database
    await connectDB();
    
    console.log('Creating admin user...');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminCredentials.email });
    
    if (existingAdmin) {
      console.log('Admin user with this email already exists!');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // Create admin user - password will be hashed automatically by User model pre-save hook
    const user = new User({
      username: adminCredentials.username,
      email: adminCredentials.email,
      password: adminCredentials.password, // Store plain text password - User model will hash it
      isAdmin: true,
      isApproved: true
    });
    
    // Save user to database
    await user.save();
    
    console.log('\nAdmin user created successfully!');
    console.log(`Username: ${adminCredentials.username}`);
    console.log(`Email: ${adminCredentials.email}`);
    console.log('\nPlease keep these credentials secure.\n');
    
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  }
};

// Run the function
createAdmin();