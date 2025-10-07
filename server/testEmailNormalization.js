const { body, validationResult } = require('express-validator');

// Test email normalization behavior
const testEmailNormalization = () => {
  console.log('=== Testing Email Normalization ===\n');
  
  const testEmails = [
    'gameslayer.inc@gmail.com',
    'gameslayerinc@gmail.com',
    'GAMESLAYER.INC@GMAIL.COM',
    'gameslayer.inc@gmail.com ',
    ' gameslayer.inc@gmail.com'
  ];
  
  testEmails.forEach((email, index) => {
    console.log(`Test ${index + 1}: "${email}"`);
    
    // Simulate the validation chain from authController
    const validationChain = body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail();
    
    // Create a mock request object
    const mockReq = { body: { email } };
    
    // Run the validation
    validationChain.run(mockReq).then(() => {
      const errors = validationResult(mockReq);
      
      if (!errors.isEmpty()) {
        console.log('  Validation errors:', errors.array());
      } else {
        console.log('  Normalized email:', mockReq.body.email);
        console.log('  Email length:', mockReq.body.email.length);
        console.log('  Email trimmed:', mockReq.body.email.trim());
        console.log('  Email lowercase:', mockReq.body.email.toLowerCase());
      }
      console.log('---');
    });
  });
};

// Test the specific normalizeEmail options
const testNormalizeEmailOptions = () => {
  console.log('\n=== Testing normalizeEmail Options ===\n');
  
  const { normalizeEmail } = require('express-validator');
  
  const testEmail = 'gameslayer.inc@gmail.com';
  
  console.log(`Original email: "${testEmail}"`);
  
  // Test default normalization
  const defaultNormalized = normalizeEmail(testEmail);
  console.log(`Default normalizeEmail: "${defaultNormalized}"`);
  
  // Test with different options
  const options = {
    all_lowercase: true,
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    gmail_convert_googlemaildotcom: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false
  };
  
  const customNormalized = normalizeEmail(testEmail, options);
  console.log(`Custom normalizeEmail (no dot removal): "${customNormalized}"`);
  
  // Test with gmail_remove_dots: true (default behavior)
  const gmailDotsRemoved = normalizeEmail(testEmail, {
    ...options,
    gmail_remove_dots: true
  });
  console.log(`Gmail dots removed: "${gmailDotsRemoved}"`);
};

// Run both tests
testEmailNormalization();
setTimeout(testNormalizeEmailOptions, 1000);