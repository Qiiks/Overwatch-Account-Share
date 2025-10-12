const dbClient = require('../config/db');
const supabase = dbClient.supabase;
const { cache, cacheKeys, CACHE_TTL } = require('../utils/cache');
const { decrypt } = require('../utils/encryption');
const { logger } = require('../utils/logger');

// @desc    Get all data for the main dashboard
// @route   GET /api/dashboard
// @access  Private
const getDashboard = async (req, res) => {
    const startTime = process.hrtime.bigint();
    logger.debug('[PERF] Dashboard request started', { userId: req.user.id });

    try {
        // Fetch user from Supabase
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id,username,email,isadmin,createdat,updatedat')
            .eq('id', req.user.id)
            .single();

        if (userError || !user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check cache first for dashboard stats
        const cacheKey = cacheKeys.accounts(req.user.id);
        let cachedData = await cache.get(cacheKey);

        let accounts = [], accountsOwned = 0, accountsShared = 0, queryDuration = 0;

        if (cachedData) {
            logger.debug('[CACHE] Dashboard data served from cache', { userId: req.user.id });
            accounts = cachedData.accounts;
            accountsOwned = cachedData.accountsOwned;
            accountsShared = cachedData.accountsShared;
            queryDuration = 0;
        } else {
            // Fetch owned accounts
            const { data: ownedAccounts, error: ownedError } = await supabase
                .from('overwatch_accounts')
                .select('*')
                .eq('owner_id', req.user.id);

            if (ownedError) throw ownedError;
            
            const ownedAccountsSafe = ownedAccounts || [];
            accountsOwned = ownedAccountsSafe.length;

            // Fetch shared account IDs
            const { data: sharedAccountIds, error: sharedIdsError } = await supabase
                .from('overwatch_account_allowed_users')
                .select('overwatch_account_id')
                .eq('user_id', req.user.id);

            if (sharedIdsError) throw sharedIdsError;

            let sharedAccounts = [];
            if (sharedAccountIds.length > 0) {
                const accountIds = sharedAccountIds.map(item => item.overwatch_account_id);
                const { data: sharedAccountsData, error: sharedError } = await supabase
                    .from('overwatch_accounts')
                    .select('*')
                    .in('id', accountIds);

                if (sharedError) throw sharedError;
                
                const sharedAccountsSafe = sharedAccountsData || [];
                sharedAccounts = sharedAccountsSafe;
            }

            accountsShared = sharedAccounts.length;
            
            // Combine all accounts
            const allAccounts = [...ownedAccountsSafe, ...sharedAccounts];
            
            // Fetch shared users for all accounts
            const accountSharedUsers = {};
            if (allAccounts.length > 0) {
                const accountIds = allAccounts.map(acc => acc.id);
                
                // Query to get all shared users for these accounts with their emails and IDs
                const { data: sharedUsersData, error: sharedUsersError } = await supabase
                    .from('overwatch_account_allowed_users')
                    .select(`
                        overwatch_account_id,
                        users!inner(id, email)
                    `)
                    .in('overwatch_account_id', accountIds);
                
                if (sharedUsersError) {
                    logger.error('Error fetching shared users:', sharedUsersError);
                } else if (sharedUsersData) {
                    // Group shared users by account ID
                    sharedUsersData.forEach(item => {
                        if (!accountSharedUsers[item.overwatch_account_id]) {
                            accountSharedUsers[item.overwatch_account_id] = [];
                        }
                        if (item.users && item.users.email && item.users.id) {
                            accountSharedUsers[item.overwatch_account_id].push({
                                id: item.users.id,
                                email: item.users.email
                            });
                        }
                    });
                }
            }
            
            // Map account fields to frontend expectations
            accounts = allAccounts.map(account => {
                // Decrypt accounttag with fallback for legacy unencrypted data
                let decryptedAccountTag = account.accounttag;
                try {
                    decryptedAccountTag = decrypt(account.accounttag);
                    logger.info(`[DECRYPT] Successfully decrypted account tag for account ${account.id}`);
                } catch (error) {
                    // If decryption fails (legacy unencrypted data), use original value
                    logger.error(`[DECRYPT] Failed to decrypt account tag for account ${account.id}:`, {
                        error: error.message,
                        accountTagPreview: account.accounttag?.substring(0, 50),
                        accountId: account.id
                    });
                    decryptedAccountTag = account.accounttag;
                }
                
                return {
                    id: account.id,
                    _id: account.id,
                    gamertag: decryptedAccountTag,
                    accountTag: decryptedAccountTag,
                    rank: account.rank,
                    heroes: account.heroes,
                    lastUsed: account.lastused,
                    sharedWith: accountSharedUsers[account.id] || [], // Array of objects with {id, email}
                    status: account.status,
                    owner_id: account.owner_id,  // CRITICAL: Include owner_id for proper categorization
                    createdAt: account.createdat,
                    updatedAt: account.updatedat,
                    // include any other fields as needed
                };
            });

            // Cache the results
            await cache.set(cacheKey, {
                accounts,
                accountsOwned,
                accountsShared
            }, CACHE_TTL.ACCOUNTS);

            queryDuration = 0; // Not measured here
            logger.debug(`[PERF] Dashboard queries completed, cached for ${CACHE_TTL.ACCOUNTS}s`);
        }

        // TODO: Implement recent activity and online users
        const recentActivity = [];
        const onlineUsers = 0;

        const totalDuration = Number(process.hrtime.bigint() - startTime) / 1000000;
        logger.debug(`[PERF] Dashboard request completed in ${totalDuration.toFixed(2)}ms`);

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.isadmin,
                createdAt: user.createdat,
                updatedAt: user.updatedat,
                accountsOwned,
                accountsShared,
            },
            accounts,
            recentActivity,
            onlineUsers,
        });
    } catch (error) {
        const totalDuration = Number(process.hrtime.bigint() - startTime) / 1000000;
        logger.error(`[PERF] Dashboard request failed after ${totalDuration.toFixed(2)}ms`, {
            error: error.message,
            stack: error.stack,
            userId: req.user.id
        });
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getDashboard: getDashboard,
};
// NOTE: This controller was refactored to use Supabase queries and match the new schema (accountTag, owner_id, etc.).
// Manual migration step: Ensure all legacy data is migrated to the new schema before using this controller.