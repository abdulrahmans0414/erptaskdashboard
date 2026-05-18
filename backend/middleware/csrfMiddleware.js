/**
 * csrfMiddleware.js
 * NOTE: CSRF protection is not needed for this API since it uses JWT Bearer tokens
 * in the Authorization header (not cookies), making CSRF attacks impossible.
 * These are safe no-op exports kept for compatibility.
 */

export const csrfMiddleware = [(req, res, next) => next()];
export const attachCsrfToken = (req, res, next) => next();
export const validateCsrf = (req, res, next) => next();
export const csrfErrorHandler = (err, req, res, next) => next(err);

export default { csrfMiddleware, attachCsrfToken, validateCsrf, csrfErrorHandler };
