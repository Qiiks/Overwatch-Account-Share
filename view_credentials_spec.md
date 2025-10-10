# View Credentials Feature Specification

## Overview
This specification outlines a system where ALL users can see ALL Overwatch accounts on the platform, but credentials (email, password, OTP) are displayed as cyberpunk-styled cipher text for unauthorized users. Only account owners and users with shared access can view the actual credentials.

## Core Concept
- **Public Visibility**: All accounts are visible to all users
- **Selective Access**: Credentials appear as animated cyberpunk cipher text for unauthorized users
- **Real Access**: Authorized users can decrypt and view actual credentials

## Visual Design

### Cyberpunk Cipher Display
For unauthorized users, sensitive fields will display as:

```
Email: ░▒▓█ ENCRYPTED █▓▒░ 
       ╔══════════════════════════╗
       ║ 4C:7A:9F:2B:E8:D3:66:A1 ║
       ║ ░░▒▒▓▓██ LOCKED ██▓▓▒▒░░ ║
       ╚══════════════════════════╝

Password: ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
         [AUTHORIZATION REQUIRED]
         ◄►◄►◄►◄►◄►◄►◄►◄►◄►

OTP: ⟨⟨ CIPHER::ACTIVE ⟩⟩
     ▌│█║▌║▌║ ACCESS DENIED ║▌║▌║█│▌
```

With animated glitch effects and matrix-style falling characters in the background.

## API Design

### Modified Endpoint: Get All Accounts with Conditional Credentials

**Endpoint**: `GET /api/overwatch-accounts`

**Authentication**: Optional (different responses for authenticated vs non-authenticated)

**Response Structure**:
```javascript
{
  success: true,
  data: [
    {
      id: "account-uuid",
      accountTag: "PlayerName#1234", // Always visible
      rank: "Diamond",               // Always visible
      mainHeroes: ["Widowmaker", "Hanzo"], // Always visible
      owner: {
        username: "OwnerName",       // Always visible
        id: "owner-uuid"
      },
      // Conditional fields based on authorization
      accountEmail: "user@example.com" || "ENCRYPTED::4C7A9F2BE8D366A1",
      accountPassword: "actualPassword" || "ENCRYPTED::AUTHORIZATION_REQUIRED",
      otp: "123456" || "CIPHER::LOCKED",
      hasAccess: true || false,      // Indicates if current user has access
      accessType: "owner" || "shared" || "none"
    }
  ]
}
```

### New Endpoint: Get Single Account Credentials

**Endpoint**: `GET /api/overwatch-accounts/:id/credentials`

**Authentication**: Required

**Authorization Logic**:
```javascript
exports.getAccountCredentials = async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const userId = req.user?.id;
    
    const account = await findOverwatchAccountById(accountId);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    // Check authorization
    const isOwner = userId && account.owner_id === userId;
    let hasSharedAccess = false;
    
    if (!isOwner && userId) {
      const { data: allowedUser } = await getSupabase()
        .from('overwatch_account_allowed_users')
        .select('*')
        .eq('overwatch_account_id', accountId)
        .eq('user_id', userId)
        .single();
      
      hasSharedAccess = !!allowedUser;
    }
    
    const hasAccess = isOwner || hasSharedAccess;
    
    if (!hasAccess) {
      // Return cipher text for unauthorized users
      return res.status(200).json({
        success: true,
        data: {
          accountTag: account.accounttag,
          accountEmail: generateCipherText('email'),
          accountPassword: generateCipherText('password'),
          otp: generateCipherText('otp'),
          hasAccess: false,
          accessType: 'none'
        }
      });
    }
    
    // Decrypt password for authorized users
    const { decrypt } = require('../utils/encryption');
    let decryptedPassword;
    
    try {
      decryptedPassword = decrypt(account.accountpassword);
    } catch (error) {
      // Handle legacy bcrypt passwords
      decryptedPassword = '[Legacy - Update Required]';
    }
    
    res.status(200).json({
      success: true,
      data: {
        accountTag: account.accounttag,
        accountEmail: account.accountemail,
        accountPassword: decryptedPassword,
        otp: account.otp || '--:--:--',
        hasAccess: true,
        accessType: isOwner ? 'owner' : 'shared'
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// Helper function to generate cyberpunk cipher text
function generateCipherText(type) {
  const cipherPatterns = {
    email: `ENCRYPTED::${generateHex(16)}`,
    password: `CIPHER::LOCKED::${generateHex(8)}`,
    otp: `ACCESS::DENIED::${Date.now().toString(16).toUpperCase()}`
  };
  return cipherPatterns[type] || 'ENCRYPTED';
}

function generateHex(length) {
  return [...Array(length)]
    .map(() => Math.floor(Math.random() * 16).toString(16).toUpperCase())
    .join('');
}
```

## Frontend Implementation

### Component: CyberpunkCredentialDisplay.tsx

```typescript
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Unlock, Copy } from 'lucide-react';

interface CyberpunkCredentialDisplayProps {
  label: string;
  value: string;
  isEncrypted: boolean;
  hasAccess: boolean;
  onDecrypt?: () => void;
}

export function CyberpunkCredentialDisplay({
  label,
  value,
  isEncrypted,
  hasAccess,
  onDecrypt
}: CyberpunkCredentialDisplayProps) {
  const [showValue, setShowValue] = useState(false);
  const [glitchText, setGlitchText] = useState(value);
  
  // Animated glitch effect for encrypted values
  useEffect(() => {
    if (isEncrypted && !hasAccess) {
      const glitchChars = '░▒▓█▌│║▐►◄↕↔';
      const interval = setInterval(() => {
        const randomGlitch = value.split('').map((char, i) => 
          Math.random() > 0.7 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : char
        ).join('');
        setGlitchText(randomGlitch);
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [isEncrypted, hasAccess, value]);
  
  return (
    <div className="credential-container">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs uppercase tracking-wider text-purple-400">
          {label}
        </label>
        {hasAccess && (
          <button
            onClick={() => setShowValue(!showValue)}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {showValue ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      
      <div className={`
        relative p-3 rounded-lg border
        ${isEncrypted && !hasAccess 
          ? 'bg-black/80 border-red-500/50 cyberpunk-glow' 
          : 'bg-black/40 border-cyan-500/30'
        }
      `}>
        {isEncrypted && !hasAccess ? (
          <div className="space-y-1">
            <div className="font-mono text-red-400 glitch-text">
              {glitchText}
            </div>
            <div className="text-xs text-red-300 uppercase tracking-widest">
              ◄ AUTHORIZATION REQUIRED ►
            </div>
            <div className="text-xs text-gray-500 font-mono">
              {`[ENCRYPTED::${Date.now().toString(16).toUpperCase().slice(-8)}]`}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type={showValue ? 'text' : 'password'}
              value={hasAccess ? value : '••••••••••••'}
              readOnly
              className="flex-1 bg-transparent text-cyan-300 font-mono outline-none"
            />
            {hasAccess && (
              <button
                onClick={() => navigator.clipboard.writeText(value)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Copy size={16} />
              </button>
            )}
          </div>
        )}
        
        {/* Animated border effect for encrypted content */}
        {isEncrypted && !hasAccess && (
          <div className="absolute inset-0 rounded-lg pointer-events-none">
            <div className="animated-border"></div>
          </div>
        )}
      </div>
      
      {onDecrypt && !hasAccess && (
        <button
          onClick={onDecrypt}
          className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
        >
          <Lock size={12} />
          Request Access
        </button>
      )}
    </div>
  );
}
```

### CSS Styles (Cyberpunk Theme)

```css
/* Add to globals.css */

@keyframes glitch {
  0% { text-shadow: 0.05em 0 0 rgba(255, 0, 0, 0.75), -0.05em -0.025em 0 rgba(0, 255, 0, 0.75), 0.025em 0.05em 0 rgba(0, 0, 255, 0.75); }
  14% { text-shadow: 0.05em 0 0 rgba(255, 0, 0, 0.75), -0.05em -0.025em 0 rgba(0, 255, 0, 0.75), 0.025em 0.05em 0 rgba(0, 0, 255, 0.75); }
  15% { text-shadow: -0.05em -0.025em 0 rgba(255, 0, 0, 0.75), 0.025em 0.025em 0 rgba(0, 255, 0, 0.75), -0.05em -0.05em 0 rgba(0, 0, 255, 0.75); }
  49% { text-shadow: -0.05em -0.025em 0 rgba(255, 0, 0, 0.75), 0.025em 0.025em 0 rgba(0, 255, 0, 0.75), -0.05em -0.05em 0 rgba(0, 0, 255, 0.75); }
  50% { text-shadow: 0.025em 0.05em 0 rgba(255, 0, 0, 0.75), 0.05em 0 0 rgba(0, 255, 0, 0.75), 0 -0.05em 0 rgba(0, 0, 255, 0.75); }
  99% { text-shadow: 0.025em 0.05em 0 rgba(255, 0, 0, 0.75), 0.05em 0 0 rgba(0, 255, 0, 0.75), 0 -0.05em 0 rgba(0, 0, 255, 0.75); }
  100% { text-shadow: -0.025em 0 0 rgba(255, 0, 0, 0.75), -0.025em -0.025em 0 rgba(0, 255, 0, 0.75), -0.025em -0.05em 0 rgba(0, 0, 255, 0.75); }
}

.glitch-text {
  animation: glitch 0.5s infinite;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.1em;
}

.cyberpunk-glow {
  box-shadow: 
    0 0 20px rgba(255, 0, 0, 0.5),
    inset 0 0 20px rgba(255, 0, 0, 0.1);
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 0, 0, 0.5), inset 0 0 20px rgba(255, 0, 0, 0.1); }
  50% { box-shadow: 0 0 30px rgba(255, 0, 0, 0.8), inset 0 0 30px rgba(255, 0, 0, 0.2); }
}

.animated-border {
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, #ff0080, #00ff88, #0080ff, #ff0080);
  background-size: 400% 400%;
  animation: gradient-shift 3s ease infinite;
  border-radius: inherit;
  opacity: 0.5;
  z-index: -1;
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* Matrix rain effect for background */
.matrix-rain {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  opacity: 0.1;
}

.matrix-rain::before {
  content: '01010111 01100101 00100000 01100001 01110010 01100101';
  position: absolute;
  top: -100%;
  left: 0;
  width: 100%;
  height: 200%;
  background: linear-gradient(0deg, transparent, rgba(0, 255, 0, 0.4), transparent);
  animation: matrix-fall 10s linear infinite;
  font-family: monospace;
  font-size: 10px;
  line-height: 10px;
  color: #00ff00;
  word-break: break-all;
}

@keyframes matrix-fall {
  to { transform: translateY(100%); }
}
```

### Updated AccountsList.tsx Component

```typescript
// In AccountsList.tsx - modify the account display

import { CyberpunkCredentialDisplay } from './CyberpunkCredentialDisplay';

// Inside the component
const [selectedAccount, setSelectedAccount] = useState(null);
const [credentials, setCredentials] = useState({});

const fetchCredentials = async (accountId: string) => {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001";
    const token = localStorage.getItem("auth_token");
    
    const response = await fetch(
      `${apiBase}/api/overwatch-accounts/${accountId}/credentials`,
      {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      setCredentials(prev => ({
        ...prev,
        [accountId]: data.data
      }));
    }
  } catch (error) {
    console.error("Error fetching credentials:", error);
  }
};

// In the render method for each account card
<div className="account-card bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-lg p-4">
  <div className="flex justify-between items-start mb-4">
    <div>
      <h3 className="text-xl font-bold text-cyan-300">{account.accountTag}</h3>
      <p className="text-sm text-gray-400">Owner: {account.owner.username}</p>
    </div>
    <div className="flex gap-2">
      {account.hasAccess && (
        <span className="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded text-xs text-green-400">
          {account.accessType === 'owner' ? 'OWNER' : 'SHARED'}
        </span>
      )}
      {!account.hasAccess && (
        <span className="px-2 py-1 bg-red-500/20 border border-red-500/50 rounded text-xs text-red-400">
          LOCKED
        </span>
      )}
    </div>
  </div>
  
  <div className="space-y-3">
    <CyberpunkCredentialDisplay
      label="Battle.net Email"
      value={credentials[account.id]?.accountEmail || account.accountEmail}
      isEncrypted={!account.hasAccess}
      hasAccess={account.hasAccess}
      onDecrypt={() => fetchCredentials(account.id)}
    />
    
    <CyberpunkCredentialDisplay
      label="Password"
      value={credentials[account.id]?.accountPassword || account.accountPassword}
      isEncrypted={!account.hasAccess}
      hasAccess={account.hasAccess}
      onDecrypt={() => fetchCredentials(account.id)}
    />
    
    <CyberpunkCredentialDisplay
      label="OTP Code"
      value={credentials[account.id]?.otp || account.otp || 'NO::OTP::AVAILABLE'}
      isEncrypted={!account.hasAccess}
      hasAccess={account.hasAccess}
      onDecrypt={() => fetchCredentials(account.id)}
    />
  </div>
  
  {/* Action buttons */}
  <div className="mt-4 flex gap-2">
    {account.hasAccess && (
      <>
        <button className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded text-sm text-cyan-300 hover:bg-cyan-500/30">
          Manage
        </button>
        <button className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded text-sm text-purple-300 hover:bg-purple-500/30">
          Share
        </button>
      </>
    )}
    {!account.hasAccess && (
      <button className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded text-sm text-yellow-300 hover:bg-yellow-500/30">
        Request Access
      </button>
    )}
  </div>
</div>
```

## Database Changes

### Password Storage Update
The current bcrypt hashing must be replaced with reversible encryption for new accounts:

```javascript
// In models/OverwatchAccount.js - createOverwatchAccount function
const { encrypt } = require('../utils/encryption');

// Replace bcrypt hashing with encryption
const encryptedPassword = encrypt(accountPassword);

const insertData = {
  ...rest,
  accountemail: accountEmail,
  accountpassword: encryptedPassword, // Now encrypted, not hashed
  accounttag: accountTag,
  password_encryption_type: 'aes' // Track encryption method
};
```

### Migration for Existing Accounts
```sql
-- Add column to track encryption type
ALTER TABLE overwatch_accounts 
ADD COLUMN IF NOT EXISTS password_encryption_type VARCHAR(10) DEFAULT 'bcrypt';

-- Update new accounts to use AES
UPDATE overwatch_accounts 
SET password_encryption_type = 'aes' 
WHERE created_at > NOW();
```

## Security Considerations

### 1. Public Account Visibility
- Account tags and basic info are public
- Credentials remain encrypted and access-controlled
- No sensitive data leaked to unauthorized users

### 2. Cipher Text Generation
- Use deterministic cipher text to prevent information leakage
- Don't reveal actual credential length or patterns
- Randomize cipher display to prevent pattern analysis

### 3. Access Control
- Maintain strict backend authorization checks
- Never send real credentials to unauthorized users
- Log all credential access attempts

### 4. Rate Limiting
```javascript
// Implement aggressive rate limiting for credential endpoints
const credentialRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many credential requests'
});

router.get('/:id/credentials', credentialRateLimit, authMiddleware, getAccountCredentials);
```

### 5. Frontend Security
- Clear credentials from memory when component unmounts
- Disable devtools in production for credential pages
- Implement clipboard auto-clear after 30 seconds
- Prevent screenshots on credential display (where possible)

## Implementation Phases

### Phase 1: Backend Foundation
1. Update password storage to use encryption (not hashing)
2. Create credentials endpoint with conditional responses
3. Implement cipher text generation for unauthorized users
4. Add rate limiting and logging

### Phase 2: Frontend Cyberpunk UI
1. Create CyberpunkCredentialDisplay component
2. Implement glitch effects and animations
3. Add matrix rain and neon glow effects
4. Integrate with existing AccountsList

### Phase 3: Security & Polish
1. Add comprehensive logging
2. Implement request access functionality
3. Add admin monitoring dashboard
4. Performance optimization

## Testing Strategy

### Unit Tests
```javascript
describe('Credential Access', () => {
  test('Owner can view real credentials', async () => {
    // Test owner access
  });
  
  test('Shared user can view real credentials', async () => {
    // Test shared access
  });
  
  test('Unauthorized user sees cipher text', async () => {
    // Test cipher display
  });
  
  test('Cipher text is consistent but secure', async () => {
    // Test cipher generation
  });
});
```

### Security Tests
- Test authorization bypass attempts
- Verify no credential leakage in responses
- Test rate limiting effectiveness
- Verify encryption/decryption cycle

## Monitoring & Analytics

Track:
- Total accounts viewed
- Credential access attempts (success/failure)
- Unauthorized access attempts
- Most shared accounts
- Access request patterns

## Future Enhancements

1. **Access Request System**: Allow users to request access to specific accounts
2. **Temporary Access Tokens**: Time-limited access grants
3. **Access Audit Trail**: Show who accessed credentials and when
4. **Custom Cipher Themes**: Different visual effects for different access levels
5. **Mobile App Integration**: Secure credential viewing on mobile devices