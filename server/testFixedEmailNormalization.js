const { body } = require('express-validator');

// Test the fixed email normalization behavior
const testFixedEmailNormalization = () => {
  console.log('=== Testing Fixed Email Normalization ===\n');
  
  const testEmail = 'gameslayer.inc@gmail.com';
  
  console.log(`Original email: "${testEmail}"`);
  
  // Simulate the fixed validation chain from authController
  const validationChain = body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail({
      gmail_remove_dots: false,
      all_lowercase: true
    });
  
  // Create a mock request object
  const mockReq = { body: { email: testEmail } };
  
  // Run the validation
  validationChain.run(mockReq).then(() => {
    console.log(`Fixed normalized email: "${mockReq.body.email}"`);
    console.log(`Email length: ${mockReq.body.email.length}`);
    console.log(`Contains period: ${mockReq.body.email.includes('.')}`);
    
    // Test with uppercase
    const upperEmail = 'GAMESLAYER.INC@GMAIL.COM';
    const mockReq2 = { body: { email: upperEmail } };
    
    return validationChain.run(mockReq2);
  }).then(() => {
    console.log(`\nUppercase test:`);
    console.log(`Original: "GAMESLAYER.INC@GMAIL.COM"`);
    console.log(`Fixed normalized: "${mockReq2.body.email}"`);
    console.log(`Is lowercase: ${mockReq2.body.email === mockReq2.body.email.toLowerCase()}`);
    console.log(`Contains period: ${mockReq2.body.email.includes('.')}`);
    
    process.exit(0);
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
};

// Run the test
testFixedEmailNormalization();