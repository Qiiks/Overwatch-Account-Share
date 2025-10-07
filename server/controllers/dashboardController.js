const dbClient = require('../config/db');
const supabase = dbClient.supabase;
const { cache, cacheKeys, CACHE_TTL } = require('../utils/cache');

// @desc    Get all data for the main dashboard
// @route   GET /api/dashboard
// @access  Private
const getDashboard = async (req, res) => {
    const startTime = process.hrtime.bigint();
    console.log('[PERF] Dashboard request started for user:', req.user.id);

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
            console.log('[CACHE] Dashboard data served from cache for user:', req.user.id);
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

            accountsOwned = ownedAccounts.length;

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
                sharedAccounts = sharedAccountsData;
            }

            accountsShared = sharedAccounts.length;
            // Map account fields to frontend expectations
            accounts = [...ownedAccounts, ...sharedAccounts].map(account => ({
                id: account.id,
                _id: account.id,
                gamertag: account.accounttag,
                accountTag: account.accounttag,
                rank: account.rank,
                heroes: account.heroes,
                lastUsed: account.lastused,
                sharedWith: account.sharedwith,
                status: account.status,
                owner_id: account.owner_id,  // CRITICAL: Include owner_id for proper categorization
                createdAt: account.createdat,
                updatedAt: account.updatedat,
                // include any other fields as needed
            }));

            // Cache the results
            await cache.set(cacheKey, {
                accounts,
                accountsOwned,
                accountsShared
            }, CACHE_TTL.ACCOUNTS);

            queryDuration = 0; // Not measured here
            console.log(`[PERF] Dashboard Supabase queries completed, cached for ${CACHE_TTL.ACCOUNTS}s`);
        }

        // TODO: Implement recent activity and online users
        const recentActivity = [];
        const onlineUsers = 0;

        const totalDuration = Number(process.hrtime.bigint() - startTime) / 1000000;
        console.log(`[PERF] Dashboard request completed in ${totalDuration.toFixed(2)}ms`);

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
        console.error(`[PERF] Dashboard request failed after ${totalDuration.toFixed(2)}ms:`, { error: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getDashboard: getDashboard,
};
// NOTE: This controller was refactored to use Supabase queries and match the new schema (accountTag, owner_id, etc.).
// Manual migration step: Ensure all legacy data is migrated to the new schema before using this controller.