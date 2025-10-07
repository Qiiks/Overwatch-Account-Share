/*
 * SECURITY WARNING: This is a sensitive script for initial setup only.
 *
 * This script creates an admin user in the database. It should be run in a trusted environment,
 * and the resulting admin credentials should be kept secure.
 *
 * This is a standalone utility script and should NOT be connected to any web server endpoint.
 * It is meant to be run directly from the command line for one-time setup.
 *
 * Usage: node createAdmin.js or npm run setup-admin
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const readline = require('readline');
require('dotenv').config();

// Import User model
const User = require('./models/User');

// Import database connection
const { connectDB } = require('./config/db');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt user for input
const promptUser = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Function to prompt for password with masking
const promptPassword = async (question) => {
  // Note: Basic readline doesn't support password masking natively
  // For production use, consider using a library like 'readline-sync' for better password handling
  console.log('\nNote: For security, password characters will be visible as you type.');
  console.log('In a production environment, consider using a library that supports password masking.\n');
  
  return await promptUser(question);
};

// Function to create admin user
const createAdmin = async () => {
  try {
    console.log('\n=== Admin User Creation ===\n');
    console.log('This script will help you create an admin user for the application.\n');
    
    // Get user input
    const username = await promptUser('Enter admin username: ');
    const email = await promptUser('Enter admin email: ');
    
    // Get password with confirmation
    let password, confirmPassword;
    do {
      password = await promptPassword('Enter admin password: ');
      confirmPassword = await promptPassword('Confirm admin password: ');
      
      if (password !== confirmPassword) {
        console.log('\nError: Passwords do not match. Please try again.\n');
      }
    } while (password !== confirmPassword);
    
    // Basic validation
    if (!username || !email || !password) {
      console.log('\nError: All fields are required.');
      rl.close();
      process.exit(1);
    }
    
    // Connect to database
    await connectDB();
    
    console.log('\nCreating admin user...');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: email });
    
    if (existingAdmin) {
      console.log('Admin user with this email already exists!');
      rl.close();
      process.exit(0);
    }
    
    
    // Create admin user - password will be hashed automatically by User model pre-save hook
    const user = new User({
      username: username,
      email: email,
      password: password, // Store plain text password - User model will hash it
      isAdmin: true,
      isApproved: true
    });
    
    // Save user to database
    await user.save();
    
    console.log('\nAdmin user created successfully!');
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log('\nPlease keep these credentials secure.\n');
    
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
    
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    rl.close();
    process.exit(1);
  }
};

// Run the function
createAdmin();