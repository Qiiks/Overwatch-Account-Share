# Gmail Multi-Alias Architecture Specification

## Executive Summary

This specification outlines a redesigned architecture for the Overwatch Account Share application to properly support Gmail's alias feature (plus addressing). The core requirement is to allow users to create multiple distinct Overwatch accounts using different email aliases of the same base Gmail account, while maintaining the ability to fetch OTPs from a single linked Google account.

## Core Requirements

### 1. Multiple Accounts with Gmail Aliases
- **Requirement**: Users MUST be able to create multiple Overwatch accounts using different Gmail aliases
- **Example**: 
  - `qiikzxics+account1@gmail.com` - First Overwatch account
  - `qiikzxics+account2@gmail.com` - Second Overwatch account  
  - `qiikzxics+battlenet3@gmail.com` - Third Overwatch account
- **All three should be treated as completely separate accounts** despite sharing the same base Gmail (`qiikzxics@gmail.com`)

### 2. Single Google Account for OTP Fetching
- **Requirement**: A single linked Google account (e.g., `qiikzxics@gmail.com`) fetches OTPs for all its alias variants
- **The OTP service must parse the `To:` header to determine which exact alias received the email**
- **The system must then update only the specific Overwatch account that matches that exact alias**

## Technical Implementation

### Database Schema Changes

#### 1. Remove Normalized Email Unique Constraint

**Current State (INCORRECT):**
```sql
-- Table: overwatch_accounts
CREATE TABLE overwatch_accounts (
    id UUID PRIMARY KEY,
    accountemail TEXT NOT NULL,
    normalized_account_email TEXT, -- Currently might have UNIQUE constraint
    -- other fields...
);

-- Potential unique constraint that needs removal:
ALTER TABLE overwatch_accounts 
DROP CONSTRAINT IF EXISTS unique_normalized_email;
```

**New State (CORRECT):**
```sql
-- Table: overwatch_accounts
CREATE TABLE overwatch_accounts (
    id UUID PRIMARY KEY,
    accountemail TEXT NOT NULL, -- This should be the ONLY unique identifier for email
    normalized_account_email TEXT, -- Keep for OTP matching, but NOT unique
    -- other fields...
    CONSTRAINT unique_account_email UNIQUE (accountemail),
    CONSTRAINT unique_account_tag UNIQUE (accounttag)
);

-- Migration to fix existing constraints:
ALTER TABLE overwatch_accounts 
DROP CONSTRAINT IF EXISTS unique_normalized_email;

-- Ensure unique constraint on exact email
ALTER TABLE overwatch_accounts 
ADD CONSTRAINT unique_account_email UNIQUE (accountemail);
```

**Rationale**: The `normalized_account_email` field is still needed for OTP service to know which base Gmail account to check, but it must NOT be unique since multiple accounts can share the same base Gmail.

### Controller Logic Changes

#### File: `server/controllers/overwatchAccountController.js`

**Current Implementation Issues:**
1. Lines 36-44: Email normalization with `.normalizeEmail()` might strip the plus alias
2. No explicit check for uniqueness based on exact email

**Required Changes:**

```javascript
exports.addAccount = [
  // CRITICAL: Do NOT use .normalizeEmail() as it strips the plus alias
  body('email')
    .if(body('email').exists())
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    // REMOVE: .normalizeEmail() - This strips the plus alias!
    .toLowerCase(), // Only lowercase, preserve the full email with alias
  
  body('accountEmail')
    .if(body('accountEmail').exists())
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    // REMOVE: .normalizeEmail()
    .toLowerCase(),

  async (req, res, next) => {
    // ... validation code ...
    
    const accountEmail = (req.body.email || req.body.accountEmail).toLowerCase().trim();
    // Keep the exact email with plus alias
    
    try {
      // Check for uniqueness based on EXACT email, not normalized
      const existingByEmail = await findOverwatchAccountByAccountEmail(accountEmail);
      if (existingByEmail) {
        return res.status(409).json({
          success: false,
          error: [{ msg: 'An account with this exact email already exists' }]
        });
      }
      
      // Check for uniqueness based on account tag
      const existingByTag = await findOverwatchAccountByAccountTag(accountTag);
      if (existingByTag) {
        return res.status(409).json({
          success: false,
          error: [{ msg: 'An account with this battletag already exists' }]
        });
      }

      // Create the account with exact email preserved
      const newAccount = await createOverwatchAccount({
        accountTag: accountTag,
        accountEmail: accountEmail, // Exact email with alias
        accountPassword,
        owner_id: req.user.id,
        linked_google_account_id: googleAccountId || null
      });
      
      // ... rest of the code
    }
  }
];
```

**Update Account Endpoint Changes:**
```javascript
exports.updateAccount = [
  // Similar changes - don't use .normalizeEmail()
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email')
    .toLowerCase(), // Preserve plus alias
    
  // ... rest of validation
  
  async (req, res, next) => {
    // ... existing code ...
    
    if (email !== undefined && email !== '') {
      updateData.accountEmail = email.toLowerCase().trim(); // Exact email
      // Still calculate normalized for OTP matching, but don't use for uniqueness
      updateData.normalized_account_email = getNormalizedEmail(email);
    }
    
    // ... rest of code
  }
];
```

### Model Logic Changes

#### File: `server/models/OverwatchAccount.js`

**Required Changes:**

```javascript
const createOverwatchAccount = async (accountData) => {
  const {
    accountPassword,
    accountEmail, // This is the EXACT email with alias
    accountTag,
    linked_google_account_id,
    ...rest
  } = accountData;

  console.log('Creating Overwatch account with exact email:', accountEmail);

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(accountPassword, salt);

  // Generate normalized email for OTP service to know which base account to check
  // But this is NOT used for uniqueness
  const normalizedEmail = getNormalizedEmail(accountEmail);

  const insertData = {
    ...rest,
    accountemail: accountEmail.toLowerCase().trim(), // Store exact email
    accountpassword: hashedPassword,
    accounttag: accountTag,
    normalized_account_email: normalizedEmail // For OTP matching only
  };
  
  // ... rest of insertion code
};

// CRITICAL: This function must search by EXACT email
const findOverwatchAccountByAccountEmail = async (accountEmail) => {
  const { data, error } = await getSupabase()
    .from('overwatch_accounts')
    .select('*')
    .eq('accountemail', accountEmail.toLowerCase().trim()) // Exact match
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }
  return data;
};
```

### OTP Service Logic Updates

#### File: `server/services/otpService.js`

**Current Implementation (Lines 207-222):** Already mostly correct! The service:
1. Extracts the recipient email from the `To:` header (line 207)
2. Finds the account by exact email match (line 217)
3. Updates only that specific account with the OTP

**Minor Verification Needed:**

```javascript
async fetchOTPsFromGoogleAccount(googleAccount, io) {
  // ... existing code ...
  
  for (const message of messages) {
    try {
      // Extract EXACT recipient email from headers 
      const recipientEmail = this.extractRecipientEmail(msg.data.payload.headers || []);
      
      if (!recipientEmail) {
        console.log(`[OTP Service] Could not extract recipient email from message ${message.id}`);
        continue;
      }

      console.log(`[OTP Service] Message ${message.id} sent to exact email: ${recipientEmail}`);

      // CRITICAL: Find by EXACT email match, not normalized
      const overwatchAccount = await OverwatchAccount.findByEmail(recipientEmail);

      if (!overwatchAccount) {
        console.log(`[OTP Service] No Overwatch account found for exact email: ${recipientEmail}`);
        continue;
      }

      console.log(`[OTP Service] Found account ${overwatchAccount.accounttag} for exact email ${recipientEmail}`);
      
      // ... rest of OTP extraction and update logic
    }
  }
}

// Ensure extractRecipientEmail preserves the full email with alias
extractRecipientEmail(headers) {
  try {
    const toHeader = headers.find(h => h.name.toLowerCase() === 'to');
    if (toHeader && toHeader.value) {
      // Extract email preserving the plus alias
      const match = toHeader.value.match(/<([^>]+)>/) || toHeader.value.match(/([^\s<>,]+@[^\s<>,]+)/);
      if (match && match[1]) {
        // Return exact email with alias preserved
        return match[1].toLowerCase().trim();
      }
    }
    // ... fallback logic
  } catch (error) {
    console.error('[OTP Service] Error parsing email headers:', error);
  }
  return null;
}
```

### Frontend Display Requirements

#### File: `client/components/AccountsList.tsx`

**Current Implementation (Line 101):** Already correct! Displays `account.accountemail`

**Required Behavior:**
- **MUST display the EXACT email with alias** (e.g., `qiikzxics+acc1@gmail.com`)
- **NOT the normalized version** (e.g., NOT `qiikzxics@gmail.com`)

```typescript
// Correct implementation (already in place):
<p className="text-sm text-gray-400">{account.accountemail}</p>
```

#### File: `client/components/modals/AddAccountModal.tsx`

**Required Behavior:**
- Allow users to enter the full email with alias
- Do NOT strip or normalize the email on the frontend
- Send the exact email to the backend

```typescript
const handleSubmit = async () => {
  const accountData = {
    battletag: formData.battletag,
    email: formData.email, // Send exact email with alias
    password: formData.password,
    googleAccountId: formData.googleAccountId
  };
  
  // Send to backend without modification
  const response = await fetch('/api/overwatch-accounts', {
    method: 'POST',
    body: JSON.stringify(accountData),
    // ...
  });
};
```

## Migration Steps

### 1. Database Migration

Create migration file: `server/migrations/2025-10-10-fix-gmail-alias-constraints.sql`

```sql
-- Remove any unique constraint on normalized_account_email
ALTER TABLE overwatch_accounts 
DROP CONSTRAINT IF EXISTS unique_normalized_email;

-- Ensure unique constraint exists on exact accountemail
ALTER TABLE overwatch_accounts 
DROP CONSTRAINT IF EXISTS unique_account_email;

ALTER TABLE overwatch_accounts 
ADD CONSTRAINT unique_account_email UNIQUE (accountemail);

-- Verify accounttag uniqueness
ALTER TABLE overwatch_accounts 
DROP CONSTRAINT IF EXISTS unique_account_tag;

ALTER TABLE overwatch_accounts 
ADD CONSTRAINT unique_account_tag UNIQUE (accounttag);

-- Add index on normalized_account_email for OTP service performance
CREATE INDEX IF NOT EXISTS idx_normalized_email 
ON overwatch_accounts(normalized_account_email);
```

### 2. Backend Code Updates

1. Update `overwatchAccountController.js`:
   - Remove `.normalizeEmail()` from validation chains
   - Add explicit uniqueness check on exact email
   
2. Verify `OverwatchAccount.js` model:
   - Ensure `findOverwatchAccountByAccountEmail` uses exact match
   - Keep normalized email generation for OTP service only

3. Verify `otpService.js`:
   - Confirm it extracts exact recipient email from headers
   - Confirm it searches by exact email match

### 3. Frontend Updates

1. Verify all components display exact emails with aliases
2. Ensure no frontend normalization occurs before sending to backend

## Testing Scenarios

### Test Case 1: Multiple Aliases, Same Base Account
1. Create account with `user+acc1@gmail.com`
2. Create account with `user+acc2@gmail.com`
3. **Expected**: Both accounts created successfully
4. **Current (Wrong)**: Second account fails due to normalized email conflict

### Test Case 2: OTP Delivery
1. Have accounts: `user+acc1@gmail.com` and `user+acc2@gmail.com`
2. Trigger OTP for `user+acc1@gmail.com`
3. **Expected**: Only `user+acc1@gmail.com` account gets updated with OTP
4. **Verify**: `user+acc2@gmail.com` remains unchanged

### Test Case 3: Display Verification
1. Create account with `user.name+battlenet@gmail.com`
2. View in AccountsList
3. **Expected**: Display shows `user.name+battlenet@gmail.com`
4. **Current (Wrong)**: Might show normalized version

## Rollback Plan

If issues arise:

1. **Database**: No destructive changes, only constraint removal
2. **Code**: Git revert the commits
3. **Data**: Existing accounts remain valid

## Success Criteria

1. ✅ Users can create multiple accounts with different Gmail aliases
2. ✅ Each alias-based account is treated as completely separate
3. ✅ OTP service correctly identifies and updates the exact account
4. ✅ Frontend displays exact emails with aliases
5. ✅ No data loss or corruption of existing accounts

## Security Considerations

1. **No Security Degradation**: Removing the normalized email uniqueness doesn't create security issues
2. **Account Isolation**: Each alias-based account maintains separate credentials
3. **OTP Delivery**: OTPs are still delivered to the correct specific account

## Timeline

1. **Phase 1** (Immediate): Database constraint updates
2. **Phase 2** (Same session): Backend controller updates  
3. **Phase 3** (Same session): Frontend verification
4. **Phase 4** (Testing): Comprehensive testing of all scenarios

## Conclusion

This specification enables the core requirement: allowing multiple Overwatch accounts with Gmail aliases while maintaining a single Google account for OTP fetching. The changes are minimal, focused, and preserve all existing functionality while enabling the new use case.