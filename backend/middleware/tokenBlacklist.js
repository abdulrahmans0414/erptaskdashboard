/**
 * tokenBlacklist.js
 * In-memory token blacklist for logout functionality
 * In production, use Redis for distributed token management
 */

import jwt from 'jsonwebtoken';

/**
 * In-memory blacklist (use Redis in production)
 * Structure: { token: expiryTimestamp }
 */
const tokenBlacklist = new Map();

/**
 * Add token to blacklist on logout
 * @param {string} token - JWT token to blacklist
 */
export const blacklistToken = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
            const expiryTime = decoded.exp * 1000; // Convert to milliseconds
            tokenBlacklist.set(token, expiryTime);
            
            // Schedule cleanup when token expires
            const timeUntilExpiry = expiryTime - Date.now();
            if (timeUntilExpiry > 0) {
                setTimeout(() => {
                    tokenBlacklist.delete(token);
                }, timeUntilExpiry);
            }
        }
    } catch (error) {
        console.error('Error blacklisting token:', error);
    }
};

/**
 * Check if token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {boolean} - True if token is blacklisted
 */
export const isTokenBlacklisted = (token) => {
    if (!tokenBlacklist.has(token)) return false;
    
    const expiryTime = tokenBlacklist.get(token);
    if (expiryTime && expiryTime <= Date.now()) {
        // Token has expired, remove from blacklist
        tokenBlacklist.delete(token);
        return false;
    }
    
    return true;
};

/**
 * Middleware to check if token is blacklisted
 * Should be called after token verification
 */
export const checkTokenBlacklist = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token && isTokenBlacklisted(token)) {
        return res.status(401).json({
            success: false,
            errorCode: 'TOKEN_BLACKLISTED',
            message: 'Token has been revoked. Please login again.',
        });
    }
    
    next();
};

/**
 * Get blacklist statistics (for monitoring)
 */
export const getBlacklistStats = () => {
    return {
        totalBlacklisted: tokenBlacklist.size,
        tokens: Array.from(tokenBlacklist.entries()).map(([token, expiry]) => ({
            tokenPreview: token.substring(0, 20) + '...',
            expiresAt: new Date(expiry),
        })),
    };
};

/**
 * Clear entire blacklist (for testing/maintenance)
 */
export const clearBlacklist = () => {
    tokenBlacklist.clear();
};

/**
 * Initialize token cleanup job (runs every 5 minutes)
 */
export const initializeTokenCleanup = () => {
    setInterval(() => {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [token, expiryTime] of tokenBlacklist.entries()) {
            if (expiryTime <= now) {
                tokenBlacklist.delete(token);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`✅ Token cleanup: Removed ${cleaned} expired tokens`);
        }
    }, 5 * 60 * 1000); // 5 minutes
};

export default {
    blacklistToken,
    isTokenBlacklisted,
    checkTokenBlacklist,
    getBlacklistStats,
    clearBlacklist,
    initializeTokenCleanup,
};
