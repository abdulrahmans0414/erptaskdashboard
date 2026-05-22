/**
 * Advanced Input Sanitization Middleware
 * Engineered for Enterprise SaaS Launch Standards:
 * 1. Deep NoSQL Injection Protection: Strips any keys in body, query, or params that start with '$' or contain '.'.
 * 2. Deep XSS Sanitization: Escapes dangerous HTML/script characters (<, >, &, ", ') in all incoming string payloads.
 */

// Helper to escape HTML characters
const escapeHtml = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

// Recursive function to sanitize objects
const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') {
        if (typeof obj === 'string') {
            return escapeHtml(obj);
        }
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    const sanitizedObj = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // NoSQL Protection: Block/ignore keys starting with '$' or containing '.'
            if (key.startsWith('$') || key.includes('.')) {
                continue;
            }

            const val = obj[key];
            sanitizedObj[key] = sanitizeObject(val);
        }
    }
    return sanitizedObj;
};

export const sanitizeInput = (req, res, next) => {
    try {
        if (req.body) {
            req.body = sanitizeObject(req.body);
        }
        if (req.query) {
            req.query = sanitizeObject(req.query);
        }
        if (req.params) {
            req.params = sanitizeObject(req.params);
        }
        next();
    } catch (error) {
        next(error);
    }
};
