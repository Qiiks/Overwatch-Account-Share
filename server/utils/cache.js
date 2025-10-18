const redis = require('redis');

// Redis client configuration
let redisClient = null;
// In-memory cache fallback
let memoryCache = new Map();

const connectRedis = async () => {
  try {
    // Redis is optional - if no REDIS_URL is provided, use in-memory cache only
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      // No Redis URL provided, continue with in-memory cache only
      redisClient = null;
      return;
    }

    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 60000,
        lazyConnect: true,
      },
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          // Don't retry on connection refused - just fail silently
          return undefined;
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return undefined;
        }
        if (options.attempt > 3) {
          // Reduce retry attempts to prevent spam
          return undefined;
        }
        // Reconnect after
        return Math.min(options.attempt * 100, 3000);
      }
    });

    redisClient.on('error', (err) => {
      redisClient = null;
    });

    await redisClient.connect();
  } catch (error) {
    // Continue without Redis if connection fails
    redisClient = null;
  }
};

// Cache key generators
const cacheKeys = {
  user: (id) => `user:${id}`,
  accounts: (userId) => `accounts:${userId}`,
  account: (id) => `account:${id}`,
  users: (page, limit) => `users:page:${page}:limit:${limit}`,
  emailService: (email) => `emailService:${email}`,
};

// Cache TTL values (in seconds)
const CACHE_TTL = {
  USER: 300, // 5 minutes
  ACCOUNTS: 180, // 3 minutes
  ACCOUNT: 300, // 5 minutes
  USERS: 300, // 5 minutes
  EMAIL_SERVICE: 3600, // 1 hour
};

// Cache operations
const cache = {
  // Get data from cache
  async get(key) {
    if (redisClient) {
      try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        // Fall back to memory cache
      }
    }

    // Use in-memory cache as fallback
    const item = memoryCache.get(key);
    if (item && item.expires > Date.now()) {
      return item.data;
    } else if (item) {
      memoryCache.delete(key); // Remove expired item
    }
    return null;
  },

  // Set data in cache
  async set(key, data, ttl = 300) {
    if (redisClient) {
      try {
        await redisClient.setEx(key, ttl, JSON.stringify(data));
        return;
      } catch (error) {
        // Fall back to memory cache
      }
    }

    // Use in-memory cache as fallback
    const expires = Date.now() + (ttl * 1000);
    memoryCache.set(key, { data, expires });
  },

  // Delete from cache
  async del(key) {
    if (redisClient) {
      try {
        await redisClient.del(key);
      } catch (error) {
        // Silently continue
      }
    }

    // Always clean up memory cache
    memoryCache.delete(key);
  },

  // Delete multiple keys by pattern
  async delPattern(pattern) {
    if (redisClient) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } catch (error) {
        // Silently continue
      }
    }

    // Clean up memory cache by pattern
    for (const [key] of memoryCache) {
      if (key.includes(pattern.replace('*', ''))) {
        memoryCache.delete(key);
      }
    }
  },

  // Clear all cache
  async clear() {
    if (redisClient) {
      try {
        await redisClient.flushAll();
      } catch (error) {
        // Silently continue
      }
    }

    // Clear memory cache
    memoryCache.clear();
  },

  // Get or set (cache miss handler)
  async getOrSet(key, fetcher, ttl = 300) {
    let data = await this.get(key);
    if (data === null) {
      data = await fetcher();
      if (data !== null) {
        await this.set(key, data, ttl);
      }
    }
    return data;
  }
};

module.exports = {
  connectRedis,
  cache,
  cacheKeys,
  CACHE_TTL
};