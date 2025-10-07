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
            // Optimized single aggregation query for both counts
            const statsQueryStart = process.hrtime.bigint();
            const [userStats, accountStats] = await Promise.all([
                User.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalUsers: { $sum: 1 },
                            activeUsers: {
                                $sum: {
                                    $cond: [
                                        { $eq: ['$isApproved', true] },
                                        1,
                                        0
                                    ]
                                }
                            }
                        }
                    }
                ]),
                OverwatchAccount.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalAccounts: { $sum: 1 }
                        }
                    }
                ])
            ]);
            queryDuration = Number(process.hrtime.bigint() - statsQueryStart) / 1000000;

            totalUsersRaw = userStats[0]?.totalUsers || 0;
            totalAccountsRaw = accountStats[0]?.totalAccounts || 0;

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

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin
const getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');

        // Format users to match Admin.tsx expectations
        const formattedUsers = users.map(user => ({
            _id: user._id,
            username: user.username,
            email: user.email,
            joinDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A',
            accountsOwned: 0, // TODO: Implement account counting
            status: user.isApproved ? 'active' : 'pending', // Map isApproved to status
            lastLogin: user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Never'
        }));

        res.json(formattedUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update a user's status
// @route   PATCH /api/admin/users/:id/status
// @access  Admin
const updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Map status string to isapproved boolean
        if (status === 'active') {
            user.isApproved = true;
        } else if (status === 'pending') {
            user.isApproved = false;
        }
        await user.save();

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
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
        const totalUsersRaw = await User.countDocuments();
        const totalAccountsRaw = await OverwatchAccount.countDocuments();

        // Convert to numbers and validate
        const totalUsers = Number(totalUsersRaw);
        const totalAccounts = Number(totalAccountsRaw);

        if (isNaN(totalUsers) || isNaN(totalAccounts)) {
            console.error('Invalid count values in dashboard: totalUsers =', totalUsersRaw, 'totalAccounts =', totalAccountsRaw);
            return res.status(500).json({ message: 'Invalid data from database' });
        }

        const activeUsers = 0; // Placeholder
        const flaggedActivities = 0; // Placeholder

        const users = await User.find().select('-password');
        const logs = []; // Placeholder

        res.json({
            stats: {
                totalUsers,
                activeUsers,
                totalAccounts,
                flaggedActivities,
            },
            users,
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
// @route   POST /api/admin/create-user
// @access  Admin
const createUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Validation
        if (!username || !email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (!['User', 'Admin'].includes(role)) {
            return res.status(400).json({ message: 'Role must be either User or Admin' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email or username already exists' });
        }

        // Create user (password will be hashed by pre-save hook)
        const user = await User.create({
            username,
            email,
            password,
            role,
            isAdmin: role === 'Admin'
        });

        // Format user to match Admin.tsx expectations
        const formattedUser = {
            _id: user._id,
            username: user.username,
            email: user.email,
            joinDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A',
            accountsOwned: 0,
            status: user.isApproved ? 'active' : 'pending',
            lastLogin: user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Never'
        };

        res.status(201).json(formattedUser);
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'User with this email or username already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getStats,
    getUsers,
    updateUserStatus,
    getLogs,
    getAdminDashboard,
    getRegistrationStatus,
    toggleRegistrations,
    createUser,
};