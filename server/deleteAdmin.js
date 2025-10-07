/*
 * This script deletes the admin user with email 'gameslayer.inc@gmail.com' from the database.
 * It should be run directly from the command line.
 * 
 * Usage: node deleteAdmin.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
const User = require('./models/User');

// Import database connection
const { connectDB } = require('./config/db');

// Function to delete admin user
const deleteAdmin = async () => {
  try {
    console.log('\n=== Admin User Deletion ===\n');
    console.log('This script will delete the admin user with email gameslayer.inc@gmail.com from the database.\n');
    
    // Connect to database
    await connectDB();
    
    console.log('Searching for admin user...');
    
    // Find and delete the admin user
    const deletedUser = await User.findOneAndDelete({ email: 'gameslayer.inc@gmail.com' });
    
    if (deletedUser) {
      console.log('\nAdmin user deleted successfully!');
      console.log(`Username: ${deletedUser.username}`);
      console.log(`Email: ${deletedUser.email}`);
      console.log(`User ID: ${deletedUser._id}`);
    } else {
      console.log('\nNo admin user found with email gameslayer.inc@gmail.com');
    }
    
    // Close database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error deleting admin user:', error.message);
    process.exit(1);
  }
};

// Run the function
deleteAdmin();