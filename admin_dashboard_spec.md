# Admin Dashboard Technical Specification

## Executive Summary
This specification details the implementation of enhanced admin dashboard functionality for the Overwatch Account Share application, focusing on user registration control and comprehensive user management capabilities.

## 1. Database Design

### 1.1 Settings Table (Already Exists)
The `settings` table is already implemented in Supabase with the following schema:
```sql
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 Default Settings
Insert default setting for registration control:
```sql
INSERT INTO settings (key, value) 
VALUES ('allow_registration', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
```

### 1.3 User Status Enhancement
The `users` table already has `isApproved` field. We'll extend the status concept:
- `active`: User is approved and can access the system (isApproved = true)
- `suspended`: User is temporarily disabled (isApproved = false, but account exists)
- `pending`: New user awaiting approval (isApproved = false, new registration)

## 2. Backend API Design

### 2.1 Settings API

#### 2.1.1 Get Public Settings
**Endpoint**: `GET /api/settings`
**Access**: Public
**Purpose**: Fetch non-sensitive settings like registration availability
**Implementation**:
```javascript
// controllers/settingsController.js
const getPublicSettings = async (req, res) => {
    try {
        const registrationSetting = await Settings.findOne({ key: 'allow_registration' });
        const allowRegistration = registrationSetting ? registrationSetting.value : true;
        
        res.json({
            allowRegistration,
            // Other public settings can be added here
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
};
```

#### 2.1.2 Update Registration Setting
**Endpoint**: `PATCH /api/settings/registration`
**Access**: Admin only
**Purpose**: Toggle user registration on/off
**Request Body**:
```json
{
    "allowRegistration": true
}
```
**Implementation**: 
```javascript
// controllers/settingsController.js
const updateRegistrationSetting = async (req, res) => {
    try {
        const { allowRegistration } = req.body;
        
        if (typeof allowRegistration !== 'boolean') {
            return res.status(400).json({ message: 'allowRegistration must be a boolean' });
        }
        
        await Settings.findOneAndUpdate(
            { key: 'allow_registration' },
            { value: allowRegistration },
            { upsert: true, new: true }
        );
        
        res.json({ 
            message: `Registration ${allowRegistration ? 'enabled' : 'disabled'}`,
            allowRegistration 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating registration setting' });
    }
};
```

### 2.2 Registration Logic Enhancement

#### 2.2.1 Modified Register Endpoint
**Endpoint**: `POST /api/auth/register`
**Enhancement**: Check registration availability before processing
```javascript
// controllers/authController.js - Add to register function
const registrationSetting = await Settings.findOne({ key: 'allow_registration' });
const allowRegistration = registrationSetting ? registrationSetting.value : true;

if (!allowRegistration) {
    return res.status(403).json({
        success: false,
        error: 'Registration is currently disabled. Please contact an administrator.'
    });
}
```

### 2.3 User Management API

#### 2.3.1 List Users (Already Exists)
**Endpoint**: `GET /api/admin/users`
**Enhancement**: Include proper status mapping and account counts
```javascript
const formattedUsers = users.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.isAdmin ? 'admin' : 'user',
    status: user.isApproved ? 'active' : 'suspended',
    joinDate: user.createdAt,
    lastLogin: user.updatedAt,
    accountsOwned: await OverwatchAccount.countDocuments({ owner_id: user.id })
}));
```

#### 2.3.2 Update User Status (Partial Implementation Exists)
**Endpoint**: `PATCH /api/admin/users/:id/status`
**Request Body**:
```json
{
    "status": "active" | "suspended" | "pending"
}
```
**Enhancement**: Add proper status handling
```javascript
const updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['active', 'suspended', 'pending'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Prevent admin from suspending themselves
        if (user.id === req.user.id && status === 'suspended') {
            return res.status(400).json({ message: 'Cannot suspend your own account' });
        }
        
        user.isApproved = (status === 'active');
        await user.save();
        
        res.json({ message: `User status updated to ${status}`, user });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user status' });
    }
};
```

#### 2.3.3 Delete User (New)
**Endpoint**: `DELETE /api/admin/users/:id`
**Purpose**: Permanently delete a user and their associated data
**Implementation**:
```javascript
const deleteUser = async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);
        
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Prevent admin from deleting themselves
        if (userToDelete.id === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        
        // Delete user's overwatch accounts
        await OverwatchAccount.deleteMany({ owner_id: req.params.id });
        
        // Remove user from shared accounts
        // This is handled by CASCADE in the database
        
        // Delete the user
        await User.deleteOne({ id: req.params.id });
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user' });
    }
};
```

### 2.4 Route Definitions

#### 2.4.1 Settings Routes (New File)
```javascript
// routes/settings.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public route
router.get('/', getPublicSettings);

// Admin routes
router.patch('/registration', protect, adminMiddleware, updateRegistrationSetting);

module.exports = router;
```

#### 2.4.2 Admin Routes Update
```javascript
// routes/admin.js - Add delete endpoint
router.delete('/users/:id', protect, adminMiddleware, deleteUser);
```

## 3. Frontend UI Design

### 3.1 Admin Page Enhancements

#### 3.1.1 Registration Toggle Component
Location: Top of admin dashboard, in Quick Actions section
```tsx
// components/RegistrationToggle.tsx
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/ui/GlassCard"

const RegistrationToggle = () => {
    const [isEnabled, setIsEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        fetchRegistrationStatus();
    }, []);
    
    const fetchRegistrationStatus = async () => {
        const response = await fetch(`${API_BASE}/api/settings`);
        const data = await response.json();
        setIsEnabled(data.allowRegistration);
    };
    
    const handleToggle = async (checked: boolean) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/settings/registration`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ allowRegistration: checked })
            });
            
            if (response.ok) {
                setIsEnabled(checked);
                toast.success(`Registration ${checked ? 'enabled' : 'disabled'}`);
            }
        } catch (error) {
            toast.error('Failed to update registration setting');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <GlassCard className="p-4">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label className="text-base font-medium">User Registration</Label>
                    <p className="text-sm text-muted-foreground">
                        {isEnabled ? "New users can register" : "Registration is disabled"}
                    </p>
                </div>
                <Switch
                    checked={isEnabled}
                    onCheckedChange={handleToggle}
                    disabled={isLoading}
                    className="data-[state=checked]:bg-[#DA70D6]"
                />
            </div>
        </GlassCard>
    );
};
```

#### 3.1.2 Enhanced User Management Table
Updates to existing table in admin page:
```tsx
// Enhanced action buttons for each user
<div className="flex items-center space-x-2">
    {/* Suspend/Activate Button */}
    {user.status === "active" ? (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <GlassButton size="sm" variant="warning">
                    Suspend
                </GlassButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Suspend User</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to suspend {user.username}? 
                        They will lose access to their account and all shared credentials.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleUserAction(user, "suspend")}>
                        Suspend User
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    ) : (
        <GlassButton 
            size="sm" 
            variant="success" 
            onClick={() => handleUserAction(user, "activate")}
        >
            Activate
        </GlassButton>
    )}
    
    {/* Delete Button */}
    <AlertDialog>
        <AlertDialogTrigger asChild>
            <GlassButton size="sm" variant="destructive">
                Delete
            </GlassButton>
        </AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-red-500">Delete User</AlertDialogTitle>
                <AlertDialogDescription>
                    <div className="space-y-2">
                        <p>This action cannot be undone. This will permanently:</p>
                        <ul className="list-disc list-inside text-sm">
                            <li>Delete the user account for {user.username}</li>
                            <li>Remove all their Overwatch accounts</li>
                            <li>Revoke all shared access permissions</li>
                            <li>Delete all associated data</li>
                        </ul>
                    </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => handleUserAction(user, "delete")}
                >
                    Delete Permanently
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</div>
```

#### 3.1.3 Create User Modal (Enhancement)
Add a button to open create user modal in admin page:
```tsx
<GlassButton onClick={() => setShowCreateUserModal(true)}>
    <Plus className="mr-2 h-4 w-4" /> Create User
</GlassButton>

// CreateUserModal component
const CreateUserModal = ({ isOpen, onClose, onUserCreated }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'user'
    });
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        const response = await fetch(`${API_BASE}/api/admin/create-user`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const newUser = await response.json();
            onUserCreated(newUser);
            onClose();
            toast.success('User created successfully');
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    {/* Form fields for username, email, password, role */}
                </form>
            </DialogContent>
        </Dialog>
    );
};
```

### 3.2 Registration Page Conditional Access

#### 3.2.1 Registration Availability Check
```tsx
// app/register/page.tsx - Add at component mount
useEffect(() => {
    checkRegistrationAvailability();
}, []);

const checkRegistrationAvailability = async () => {
    try {
        const response = await fetch(`${API_BASE}/api/settings`);
        const data = await response.json();
        
        if (!data.allowRegistration) {
            setRegistrationDisabled(true);
            // Optionally redirect to login with message
            router.push('/login?message=registration_disabled');
        }
    } catch (error) {
        console.error('Failed to check registration status');
    }
};

// Display message when registration is disabled
{registrationDisabled && (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
        <p className="text-yellow-400">
            Registration is currently disabled. Please contact an administrator 
            for account creation.
        </p>
    </div>
)}
```

#### 3.2.2 Navigation Conditional Display
```tsx
// components/Navigation.tsx - Conditionally show Register link
const [showRegisterLink, setShowRegisterLink] = useState(true);

useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
        .then(res => res.json())
        .then(data => setShowRegisterLink(data.allowRegistration))
        .catch(() => setShowRegisterLink(true)); // Default to showing
}, []);

// In the navigation render
{showRegisterLink && !isLoggedIn && (
    <Link href="/register">Register</Link>
)}
```

## 4. Implementation Plan

### Phase 1: Backend Infrastructure (Priority: High)
1. Create settings controller with public and admin endpoints
2. Add registration check to auth controller
3. Implement delete user functionality in admin controller
4. Create settings routes file
5. Update admin routes with delete endpoint

### Phase 2: Frontend Registration Control (Priority: High)
1. Create RegistrationToggle component
2. Integrate toggle into admin dashboard
3. Add registration availability check to register page
4. Update Navigation component for conditional display

### Phase 3: User Management Enhancement (Priority: Medium)
1. Enhance user status update logic
2. Add delete confirmation dialogs
3. Implement proper error handling and feedback
4. Add activity logging for admin actions

### Phase 4: Testing & Validation (Priority: High)
1. Test registration toggle functionality
2. Verify user deletion cascades properly
3. Test permission checks (can't delete/suspend self)
4. Validate registration blocking when disabled

## 5. Security Considerations

### 5.1 Permission Checks
- All admin endpoints must verify admin role via middleware
- Prevent admins from deleting or suspending their own accounts
- Ensure at least one admin account always exists

### 5.2 Data Integrity
- User deletion should cascade to remove:
  - Owned Overwatch accounts
  - Shared account permissions
  - Associated Google accounts
  - Activity logs

### 5.3 Audit Trail
- Log all admin actions with timestamp and actor
- Track registration toggle changes
- Record user status changes and deletions

## 6. Error Handling

### 6.1 Registration Disabled Error
```json
{
    "success": false,
    "error": "Registration is currently disabled. Please contact an administrator.",
    "code": "REGISTRATION_DISABLED"
}
```

### 6.2 Self-Action Prevention
```json
{
    "success": false,
    "error": "Cannot perform this action on your own account",
    "code": "SELF_ACTION_PREVENTED"
}
```

### 6.3 Last Admin Protection
```json
{
    "success": false,
    "error": "Cannot remove the last admin account",
    "code": "LAST_ADMIN_PROTECTED"
}
```

## 7. Database Migrations

### 7.1 Insert Default Settings
```sql
-- Migration: 2025-10-10-add-default-settings.sql
INSERT INTO settings (key, value) 
VALUES 
    ('allow_registration', 'true'::jsonb),
    ('require_email_verification', 'false'::jsonb),
    ('max_accounts_per_user', '10'::jsonb)
ON CONFLICT (key) DO NOTHING;
```

## 8. API Documentation Updates

### 8.1 New Endpoints
```yaml
/api/settings:
  get:
    description: Get public application settings
    responses:
      200:
        content:
          allowRegistration: boolean
          
/api/settings/registration:
  patch:
    description: Update registration availability (Admin only)
    requestBody:
      allowRegistration: boolean
    responses:
      200:
        content:
          message: string
          allowRegistration: boolean
          
/api/admin/users/{id}:
  delete:
    description: Delete a user account (Admin only)
    parameters:
      - name: id
        in: path
        required: true
    responses:
      200:
        content:
          message: "User deleted successfully"
```

## 9. Testing Scenarios

### 9.1 Registration Toggle
1. Admin disables registration
2. New visitor attempts to register - should be blocked
3. Direct API call to register - should return 403
4. Admin re-enables registration
5. New visitor can register successfully

### 9.2 User Deletion
1. Admin deletes regular user
2. Verify user's accounts are removed
3. Verify shared permissions are revoked
4. Attempt to delete self - should fail
5. Attempt to delete last admin - should fail

### 9.3 Status Management
1. Suspend active user - verify login fails
2. Activate suspended user - verify login succeeds
3. Batch status updates - verify consistency

## 10. Future Enhancements

### 10.1 Advanced Features
- Bulk user operations (suspend/delete multiple)
- User approval workflow for new registrations
- Email notifications for status changes
- Temporary suspension with auto-reactivation
- Registration invite codes for controlled access

### 10.2 Monitoring
- Admin action audit log viewer
- User activity dashboard
- System health metrics
- Registration attempt tracking

## 11. Conclusion

This specification provides a complete implementation plan for enhanced admin dashboard functionality, focusing on registration control and comprehensive user management. The design leverages existing infrastructure while adding critical administrative capabilities for platform control and user lifecycle management.