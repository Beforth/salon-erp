const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: message || 'Too many requests. Please try again later.',
        details: {
          retry_after: Math.ceil(windowMs / 1000),
          limit: max,
          window: `${Math.ceil(windowMs / 60000)} minute(s)`,
        },
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Standard rate limiter for most endpoints
const standardLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  100, // 100 requests per minute
  'Too many requests. Please try again later.'
);

// Stricter limiter for auth endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests per 15 minutes
  'Too many login attempts. Please try again later.'
);

// Limiter for file uploads
const uploadLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  10, // 10 uploads per minute
  'Too many uploads. Please try again later.'
);

module.exports = { standardLimiter, authLimiter, uploadLimiter };
