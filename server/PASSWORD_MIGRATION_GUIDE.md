# Password Migration Notification System

## Overview

This document describes the security enhancement implemented to handle legacy bcrypt passwords for Overwatch accounts and notify users to update them.

## Background

**Security Audit Finding**: "Weak Password Encryption Detection"

### The Problem
- **User Login Passwords**: Use bcrypt (one-way hashing) - SECURE ✅
- **Overwatch Account Passwords**: Some legacy accounts still use bcrypt - INSECURE ⚠️
  - Bcrypt is one-way, so users cannot view their Overwatch account credentials
  - The application requires reversible encryption (AES) to display credentials

### The Solution
Implement a notification system that alerts users when they have Overwatch accounts with legacy bcrypt passwords that need updating.

## Technical Implementation

### Backend Changes

#### 1. Login Response Enhancement (`authController.js`)

After successful user authentication, the login endpoint now checks for legacy passwords:

```javascript
// Check user's Overwatch accounts for bcrypt passwords
const userAccounts = await supabase
  .from('overwatch_accounts')
  .select('id, password_encryption_type')
  .eq('owner_id', user._id);

const legacyAccounts = userAccounts.filter(
  account => account.password_encryption_type === 'bcrypt'
);
```

#### 2. Login Response Fields

The login response now includes two new fields:

```javascript
{
  success: true,
  token: "jwt_token_here",
  id: "user_id",
  role: "user",
  isAdmin: false,
  username: "username",
  email: "user@example.com",
  isApproved: true,
  // NEW FIELDS:
  hasLegacyPasswords: true,     // Boolean flag
  legacyPasswordCount: 2        // Number of accounts needing update
}
```

### Frontend Integration

#### 1. Detect Legacy Passwords on Login

```typescript
// In login page component
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

const data = await response.json();

if (data.success) {
  // Store user data
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('user', JSON.stringify(data));
  
  // Check for legacy passwords
  if (data.hasLegacyPasswords) {
    showLegacyPasswordNotification(data.legacyPasswordCount);
  }
  
  // Redirect to dashboard
  router.push('/dashboard');
}
```

#### 2. Display Notification Banner

```typescript
function showLegacyPasswordNotification(count: number) {
  const message = count === 1
    ? 'You have 1 Overwatch account with a legacy password that needs updating.'
    : `You have ${count} Overwatch accounts with legacy passwords that need updating.`;
  
  toast.warning(message, {
    duration: 10000,
    action: {
      label: 'Update Now',
      onClick: () => router.push('/accounts')
    }
  });
}
```

#### 3. Identify Legacy Accounts in UI

Accounts with `password_encryption_type === 'bcrypt'` will display:
- Password field shows: `[Legacy Password - Update Required]`
- Visual indicator (badge/icon) next to the account
- "Update Password" button/link

### Migration Workflow

#### For Users:

1. **Login**: System detects legacy passwords and shows notification
2. **Navigate to Accounts**: Legacy accounts are clearly marked
3. **Update Account**: User edits account and provides the current password again
4. **Automatic Migration**: System re-encrypts with AES during update

#### For Administrators:

1. **Check All Accounts**: Run database query to identify all bcrypt accounts
```sql
SELECT 
  id, 
  accounttag, 
  owner_id, 
  password_encryption_type 
FROM overwatch_accounts 
WHERE password_encryption_type = 'bcrypt';
```

2. **Contact Users**: Notify users to update their accounts
3. **Monitor Progress**: Track migration completion over time

### Security Considerations

#### Why This Approach?

1. **No Automatic Conversion**: Bcrypt hashes cannot be converted to AES without the original plaintext password
2. **User-Driven Migration**: Only users know their Overwatch account passwords
3. **Non-Blocking**: Users can still log in; migration happens when convenient
4. **Transparent**: Clear messaging about why update is needed

#### What Stays Bcrypt?

- **User login passwords**: Always use bcrypt (secure, one-way)
- **Never migrated**: User authentication passwords should NEVER use reversible encryption

#### What Uses AES?

- **New Overwatch account passwords**: Automatically encrypted with AES
- **Updated Overwatch account passwords**: Automatically re-encrypted with AES
- **Reason**: Users need to view/copy these credentials

### Error Handling

The legacy password check is non-critical:

```javascript
try {
  // Check for legacy passwords
} catch (accountCheckError) {
  // Log warning but don't block login
  logger.warn('[SECURITY] Failed to check for legacy passwords', {
    error: accountCheckError.message,
    userId: user._id
  });
  // User can still log in successfully
}
```

### Database Schema

The `overwatch_accounts` table includes:

```sql
password_encryption_type VARCHAR(10) DEFAULT 'bcrypt'
-- Values: 'bcrypt' (legacy) or 'aes' (current)
```

### API Endpoints

#### Update Account (Triggers Migration)
```
PUT /api/overwatch-accounts/:id
Body: {
  battletag: "NewTag#1234",  // optional
  email: "account@example.com",  // optional
  password: "new_password"  // Automatically encrypted with AES
}
```

When password is updated, the system:
1. Encrypts with AES
2. Sets `password_encryption_type = 'aes'`
3. Stores encrypted password in database

### Testing

#### Test Scenario 1: User with Legacy Passwords

```bash
# 1. Login as user with legacy bcrypt passwords
POST /api/auth/login
{
  "email": "test@example.com",
  "password": "userpassword"
}

# Expected response includes:
{
  "hasLegacyPasswords": true,
  "legacyPasswordCount": 2
}
```

#### Test Scenario 2: User with No Legacy Passwords

```bash
# All accounts use AES encryption
# Expected response:
{
  "hasLegacyPasswords": false,
  "legacyPasswordCount": 0
}
```

#### Test Scenario 3: Update Legacy Account

```bash
# Update account password
PUT /api/overwatch-accounts/{id}
{
  "password": "updated_password"
}

# System automatically:
# - Encrypts with AES
# - Sets password_encryption_type = 'aes'
# - Next login will show: hasLegacyPasswords: false
```

### Monitoring & Metrics

Track migration progress:

```sql
-- Count of legacy vs modern passwords
SELECT 
  password_encryption_type,
  COUNT(*) as count
FROM overwatch_accounts
GROUP BY password_encryption_type;

-- Users with legacy passwords
SELECT 
  u.id,
  u.username,
  u.email,
  COUNT(oa.id) as legacy_account_count
FROM users u
JOIN overwatch_accounts oa ON u.id = oa.owner_id
WHERE oa.password_encryption_type = 'bcrypt'
GROUP BY u.id, u.username, u.email;
```

### Future Enhancements

1. **Email Notifications**: Send email reminders to users with legacy passwords
2. **Deadline Enforcement**: Set a deadline after which bcrypt passwords are disabled
3. **Batch Migration Tool**: Admin tool to assist users in bulk updates
4. **Analytics Dashboard**: Track migration progress over time

## Summary

This notification system provides a secure, user-friendly way to migrate legacy bcrypt passwords to AES encryption without blocking user access. It follows security best practices by:

- Keeping user login passwords as bcrypt (secure)
- Migrating Overwatch account passwords to AES (functional requirement)
- Providing clear user notifications
- Allowing non-blocking, gradual migration
- Maintaining full audit trail through logging

---

**Last Updated**: 2025-10-12  
**Security Audit**: HIGH severity vulnerability resolved