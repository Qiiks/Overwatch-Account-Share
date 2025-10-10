const User = require('../models/User');
const OverwatchAccount = require('../models/OverwatchAccount');
const Settings = require('../models/Settings');
const { body, validationResult } = require('express-validator');
const { cache, CACHE_TTL } = require('../utils/cache');

// @desc    Get high-level statistics
// @route   GET /api/admin/stats
// @access  Admin
const getStats = async (req, res) => {
    const startTime = process.hrtime.bigint();
    console.log(`[PERF] Admin stats request started`);

    try {
        // Check cache first for admin stats
        const cacheKey = 'admin:stats';
        let cachedStats = await cache.get(cacheKey);

        let totalUsersRaw, totalAccountsRaw, queryDuration;

        if (cachedStats) {
            console.log(`[CACHE] Admin stats served from cache`);
            totalUsersRaw = cachedStats.totalUsers;
            totalAccountsRaw = cachedStats.totalAccounts;
            queryDuration = 0;
        } else {
            // Use Supabase to get counts
            const statsQueryStart = process.hrtime.bigint();
            const supabase = global.supabase;
            
            const [usersResult, accountsResult] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }),
                supabase.from('overwatch_accounts').select('*', { count: 'exact', head: true })
            ]);
            
            queryDuration = Number(process.hrtime.bigint() - statsQueryStart) / 1000000;

            if (usersResult.error) {
                console.error('Error counting users:', usersResult.error);
                throw usersResult.error;
            }
            if (accountsResult.error) {
                console.error('Error counting accounts:', accountsResult.error);
                throw accountsResult.error;
            }

            totalUsersRaw = usersResult.count || 0;
            totalAccountsRaw = accountsResult.count || 0;

            // Cache the results
            await cache.set(cacheKey, {
                totalUsers: totalUsersRaw,
                totalAccounts: totalAccountsRaw
            }, CACHE_TTL.USERS);

            console.log(`[PERF] Admin stats aggregation queries took ${queryDuration.toFixed(2)}ms, cached for ${CACHE_TTL.USERS}s`);
        }

        // Convert to numbers and validate
        const totalUsers = Number(totalUsersRaw);
        const totalAccounts = Number(totalAccountsRaw);

        if (isNaN(totalUsers) || isNaN(totalAccounts)) {
            console.error('Invalid count values: totalUsers =', totalUsersRaw, 'totalAccounts =', totalAccountsRaw);
            return res.status(500).json({ message: 'Invalid data from database' });
        }

        // TODO: Implement activeUsers and flaggedActivities
        const activeUsers = 0;
        const flaggedActivities = 0;

        const totalDuration = Number(process.hrtime.bigint() - startTime) / 1000000;
        console.log(`[PERF] Admin stats request completed in ${totalDuration.toFixed(2)}ms`);

        const responseData = {
            totalUsers,
            activeUsers,
            totalAccounts,
            flaggedActivities,
        };

        res.json(responseData);
    } catch (error) {
        const totalDuration = Number(process.hrtime.bigint() - startTime) / 1000000;
        console.error(`[PERF] Admin stats request failed after ${totalDuration.toFixed(2)}ms:`, error);
        res.status(500).json({ message: 'Server error retrieving stats' });
    }
};

// @desc    Get all users (listUsers)
// @route   GET /api/admin/users
// @access  Admin
const listUsers = async (req, res) => {
    try {
        const supabase = global.supabase;
        
        // Get all users from Supabase
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, username, email, isadmin, isapproved, createdat, updatedat');

        if (usersError) {
            console.error('Error fetching users:', usersError);
            throw usersError;
        }

        // Get account counts for all users
        const { data: accountCounts, error: countsError } = await supabase
            .from('overwatch_accounts')
            .select('owner_id');

        if (countsError) {
            console.error('Error fetching account counts:', countsError);
            throw countsError;
        }

        // Count accounts per user
        const accountCountMap = {};
        if (accountCounts) {
            accountCounts.forEach(account => {
                accountCountMap[account.owner_id] = (accountCountMap[account.owner_id] || 0) + 1;
            });
        }

        // Format users for frontend
        const formattedUsers = users.map(user => ({
            _id: user.id,
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.isadmin ? 'admin' : 'user',
            joinDate: user.createdat ? new Date(user.createdat).toLocaleDateString() : 'N/A',
            accountsOwned: accountCountMap[user.id] || 0,
            status: user.isapproved ? 'active' : 'suspended',
            lastLogin: user.updatedat ? new Date(user.updatedat).toLocaleDateString() : 'Never',
            isAdmin: user.isadmin || false
        }));

        res.json(formattedUsers);
    } catch (error) {
        console.error('Error in listUsers:', error);
        res.status(500).json({ message: 'Server error fetching users' });
    }
};

// Keep the old function name for backward compatibility
const getUsers = listUsers;

// @desc    Update a user's status
// @route   PATCH /api/admin/users/:id/status
// @access  Admin
const updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['active', 'suspended', 'pending'];
        
        // Validate status
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: 'Invalid status. Must be one of: active, suspended, pending'
            });
        }
        
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admin from suspending themselves
        if ((user.id || user._id).toString() === req.user.id && (status === 'suspended' || status === 'pending')) {
            return res.status(400).json({
                message: 'Cannot suspend or set your own account to pending',
                code: 'SELF_ACTION_PREVENTED'
            });
        }

        // Map status string to isApproved boolean and update in database
        const supabase = global.supabase;
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ isapproved: (status === 'active') })
            .eq('id', req.params.id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating user status:', updateError);
            throw updateError;
        }

        // Update the user object with the new data
        Object.assign(user, updatedUser);

        // Return formatted user data
        const { count: accountCount, error: countError } = await supabase
            .from('overwatch_accounts')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', user.id || user._id);

        if (countError) {
            console.error('Error counting user accounts:', countError);
        }

        const formattedUser = {
            _id: user.id || user._id,
            id: user.id || user._id,
            username: user.username,
            email: user.email,
            role: (user.isadmin || user.isAdmin) ? 'admin' : 'user',
            status: (user.isapproved !== undefined ? user.isapproved : user.isApproved) ? 'active' : 'suspended',
            joinDate: (user.createdat || user.createdAt) ? new Date(user.createdat || user.createdAt).toLocaleDateString() : 'N/A',
            accountsOwned: accountCount || 0,
            lastLogin: (user.updatedat || user.updatedAt) ? new Date(user.updatedat || user.updatedAt).toLocaleDateString() : 'Never'
        };

        res.json({
            message: `User status updated to ${status}`,
            user: formattedUser
        });
    } catch (error) {
        console.error('Error in updateUserStatus:', error);
        res.status(500).json({ message: 'Server error updating user status' });
    }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Admin
const deleteUser = async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);
        
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Prevent admin from deleting themselves
        if ((userToDelete.id || userToDelete._id).toString() === req.user.id) {
            return res.status(400).json({
                message: 'Cannot delete your own account',
                code: 'SELF_ACTION_PREVENTED'
            });
        }
        
        // Check if this is the last admin (optional safety check)
        if (userToDelete.isadmin || userToDelete.isAdmin) {
            const supabase = global.supabase;
            const { count: adminCount, error: countError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('isadmin', true);

            if (countError) {
                console.error('Error counting admins:', countError);
                throw countError;
            }

            if (adminCount <= 1) {
                return res.status(400).json({
                    message: 'Cannot delete the last admin account',
                    code: 'LAST_ADMIN_PROTECTED'
                });
            }
        }
        
        // Delete user's overwatch accounts
        const supabase = global.supabase;
        const { data: accountsToDelete, error: fetchError } = await supabase
            .from('overwatch_accounts')
            .select('id')
            .eq('owner_id', req.params.id);

        if (fetchError) {
            console.error('Error fetching accounts to delete:', fetchError);
            throw fetchError;
        }

        const accountsDeleted = accountsToDelete ? accountsToDelete.length : 0;

        if (accountsDeleted > 0) {
            const { error: deleteAccountsError } = await supabase
                .from('overwatch_accounts')
                .delete()
                .eq('owner_id', req.params.id);

            if (deleteAccountsError) {
                console.error('Error deleting accounts:', deleteAccountsError);
                throw deleteAccountsError;
            }
        }
        
        console.log(`Deleted ${accountsDeleted} Overwatch accounts for user ${userToDelete.username}`);
        
        // Delete the user
        const { error: deleteUserError } = await supabase
            .from('users')
            .delete()
            .eq('id', req.params.id);

        if (deleteUserError) {
            console.error('Error deleting user:', deleteUserError);
            throw deleteUserError;
        }
        
        res.json({
            message: 'User deleted successfully',
            deletedUser: {
                username: userToDelete.username,
                email: userToDelete.email,
                accountsDeleted: accountsDeleted
            }
        });
    } catch (error) {
        console.error('Error in deleteUser:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};

// @desc    Get recent system-wide activity logs
// @route   GET /api/admin/logs
// @access  Admin
const getLogs = async (req, res) => {
    try {
        // TODO: Implement logging
        const logs = [];
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getAdminDashboard = async (req, res) => {
    try {
        const supabase = global.supabase;
        
        // Get total users count
        const { count: totalUsers, error: usersCountError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (usersCountError) {
            console.error('Error counting users:', usersCountError);
            throw usersCountError;
        }

        // Get total accounts count
        const { count: totalAccounts, error: accountsCountError } = await supabase
            .from('overwatch_accounts')
            .select('*', { count: 'exact', head: true });

        if (accountsCountError) {
            console.error('Error counting accounts:', accountsCountError);
            throw accountsCountError;
        }

        // Get all users
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, username, email, isadmin, isapproved, createdat, updatedat');

        if (usersError) {
            console.error('Error fetching users:', usersError);
            throw usersError;
        }

        const activeUsers = 0; // Placeholder
        const flaggedActivities = 0; // Placeholder
        const sharedCredentials = 0; // Placeholder - TODO: implement
        const systemHealth = "healthy"; // Default to healthy
        const logs = []; // Placeholder

        res.json({
            stats: {
                totalUsers: totalUsers || 0,
                activeUsers,
                totalCredentials: totalAccounts || 0, // Map totalAccounts to totalCredentials
                sharedCredentials,
                flaggedActivities,
                systemHealth
            },
            users: users || [],
            logs,
        });
    } catch (error) {
        console.error('Error in getAdminDashboard:', error);
        res.status(500).json({ message: 'Server error retrieving dashboard data' });
    }
};

// @desc    Get current registration status
// @route   GET /api/admin/registration-status
// @access  Admin
const getRegistrationStatus = async (req, res) => {
    try {
        const setting = await Settings.findOne({ key: 'registrationsEnabled' });
        const enabled = setting ? setting.value : true; // Default to true if not set
        res.json(enabled);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Toggle user registrations on/off
// @route   POST /api/admin/toggle-registrations
// @access  Admin
const toggleRegistrations = async (req, res) => {
    try {
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ message: 'Enabled must be a boolean value' });
        }

        // Update or create the setting
        await Settings.findOneAndUpdate(
            { key: 'registrationsEnabled' },
            { value: enabled },
            { upsert: true, new: true }
        );

        res.json({ message: `User registrations ${enabled ? 'enabled' : 'disabled'} successfully`, enabled });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create a new user
// @route   POST /api/admin/users
// @access  Admin
const createUser = async (req, res) => {
    try {
        const { username, email, password, role = 'user' } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                message: 'Username, email, and password are required'
            });
        }

        // Validate role
        const validRoles = ['user', 'admin'];
        const normalizedRole = role.toLowerCase();
        if (!validRoles.includes(normalizedRole)) {
            return res.status(400).json({
                message: 'Role must be either "user" or "admin"'
            });
        }

        // Check if user already exists
        const supabase = global.supabase;
        const { data: existingUsers, error: searchError } = await supabase
            .from('users')
            .select('email, username')
            .or(`email.eq.${email.toLowerCase()},username.eq.${username.toLowerCase()}`);

        if (searchError) {
            console.error('Error checking existing users:', searchError);
            throw searchError;
        }
        
        if (existingUsers && existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
            return res.status(400).json({
                message: `User with this ${field} already exists`
            });
        }

        // Create user instance and save (password will be hashed)
        const newUser = new User({
            username,
            email,
            password,
            role: normalizedRole === 'admin' ? 'Admin' : 'User',
            isAdmin: normalizedRole === 'admin',
            isApproved: true // Admin-created users are automatically approved
        });

        const user = await newUser.save();

        // Format user to match frontend expectations
        const formattedUser = {
            _id: user.id,
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.isadmin ? 'admin' : 'user',
            joinDate: user.createdat ? new Date(user.createdat).toLocaleDateString() : 'N/A',
            accountsOwned: 0,
            status: 'active', // Admin-created users are active by default
            lastLogin: 'Never',
            isAdmin: user.isadmin || false
        };

        res.status(201).json({
            message: `User ${username} created successfully`,
            user: formattedUser
        });
    } catch (error) {
        console.error('Error in createUser:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'User with this email or username already exists'
            });
        }
        res.status(500).json({ message: 'Server error creating user' });
    }
};

module.exports = {
    getStats,
    getUsers,
    listUsers,
    updateUserStatus,
    deleteUser,
    getLogs,
    getAdminDashboard,
    getRegistrationStatus,
    toggleRegistrations,
    createUser,
};