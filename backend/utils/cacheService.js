import Redis from 'ioredis';
import NodeCache from 'node-cache';
import logger from '../logger.js';

// Initialize Fallback Cache (In-Memory)
// stdTTL: 5 minutes (300 seconds), checkperiod: 60s
const memoryCache = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false });

let redisClient = null;
let isRedisConnected = false;

if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
        retryStrategy(times) {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        maxRetriesPerRequest: 3
    });

    redisClient.on('connect', () => {
        logger.info('🟢 Redis Cache Connected Successfully');
        isRedisConnected = true;
    });

    redisClient.on('error', (err) => {
        logger.warn(`⚠️ Redis Connection Error: ${err.message}. Falling back to in-memory cache.`);
        isRedisConnected = false;
    });
    
    redisClient.on('close', () => {
        isRedisConnected = false;
    });
} else {
    logger.info('🟡 No REDIS_URL provided. Using strictly In-Memory Cache (node-cache).');
}

/**
 * Get data from cache
 * @param {string} key 
 * @returns {any}
 */
export const getCache = async (key) => {
    try {
        if (isRedisConnected && redisClient) {
            const data = await redisClient.get(key);
            if (data) return JSON.parse(data);
            return null;
        } else {
            return memoryCache.get(key) || null;
        }
    } catch (error) {
        logger.error(`Cache GET Error [${key}]:`, error);
        return null;
    }
};

/**
 * Set data to cache
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlSeconds Default: 300 (5 minutes)
 */
export const setCache = async (key, value, ttlSeconds = 300) => {
    try {
        if (isRedisConnected && redisClient) {
            await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        } else {
            memoryCache.set(key, value, ttlSeconds);
        }
    } catch (error) {
        logger.error(`Cache SET Error [${key}]:`, error);
    }
};

/**
 * Delete a specific key from cache
 * @param {string} key 
 */
export const delCache = async (key) => {
    try {
        if (isRedisConnected && redisClient) {
            await redisClient.del(key);
        } else {
            memoryCache.del(key);
        }
    } catch (error) {
        logger.error(`Cache DEL Error [${key}]:`, error);
    }
};

/**
 * Delete all keys matching a specific pattern (e.g. "users:*")
 * @param {string} pattern 
 */
export const flushCachePattern = async (pattern) => {
    try {
        if (isRedisConnected && redisClient) {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(...keys);
            }
        } else {
            // NodeCache doesn't natively support wildcards, so we iterate
            const keys = memoryCache.keys();
            const regex = new RegExp(`^${pattern.replace('*', '.*')}$`);
            const matchingKeys = keys.filter(k => regex.test(k));
            if (matchingKeys.length > 0) {
                memoryCache.del(matchingKeys);
            }
        }
    } catch (error) {
        logger.error(`Cache FLUSH PATTERN Error [${pattern}]:`, error);
    }
};
