const { createClient } = require('@supabase/supabase-js');
const { connectRedis } = require('../utils/cache');
const { logger } = require('../utils/logger');

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service role key for server-side operations with full access
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Export for use in models
global.supabase = supabase;

const connectDB = async () => {
  try {
    // Test Supabase connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 means table exists but no rows
      throw error;
    }
    
    logger.info('Successfully connected to Supabase', { url: supabaseUrl });

    // Connect to Redis (optional - don't fail if not available)
    try {
      await connectRedis();
    } catch (redisError) {
      logger.warn('Redis connection failed, continuing without caching.', { message: redisError.message });
    }

  } catch (err) {
    logger.error('Database connection error:', { message: err.message, stack: err.stack });
    process.exit(1);
  }
};

// Close connections on app termination
process.on('SIGINT', async () => {
  logger.info('Database connections closed through app termination');
  process.exit(0);
});

module.exports = {
  supabase,
  connectDB
};