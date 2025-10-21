// Using custom rate limiter for Vercel compatibility

/**
 * Rate limiting configurations for different endpoints
 * Protects against DoS attacks and brute force attempts
 */

// Memory store for rate limiting (works in serverless)
class MemoryStore {
  constructor() {
    this.hits = new Map();
    this.resetTime = new Map();
  }

  incr(key, cb) {
    const now = Date.now();
    const resetTime = this.resetTime.get(key) || now + 60000; // 1 minute default
    
    if (now > resetTime) {
      this.hits.set(key, 1);
      this.resetTime.set(key, now + 60000);
      return cb(null, 1, resetTime);
    }
    
    const hits = (this.hits.get(key) || 0) + 1;
    this.hits.set(key, hits);
    
    return cb(null, hits, resetTime);
  }

  decrement(key) {
    const hits = this.hits.get(key) || 0;
    if (hits > 0) {
      this.hits.set(key, hits - 1);
    }
  }

  resetKey(key) {
    this.hits.delete(key);
    this.resetTime.delete(key);
  }

  resetAll() {
    this.hits.clear();
    this.resetTime.clear();
  }
}

const store = new MemoryStore();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, resetTime] of store.resetTime.entries()) {
    if (now > resetTime + 300000) { // 5 minutes after reset
      store.hits.delete(key);
      store.resetTime.delete(key);
    }
  }
}, 300000);

/**
 * General rate limiter - 100 requests per 15 minutes
 */
const generalLimiter = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  store
};

/**
 * Authentication rate limiter - 5 attempts per 15 minutes
 */
const authLimiter = {
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many authentication attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  store
};

/**
 * Strict rate limiter for sensitive operations - 3 attempts per hour
 */
const strictLimiter = {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Too many sensitive requests, please try again in 1 hour' },
  standardHeaders: true,
  legacyHeaders: false,
  store
};

/**
 * API rate limiter - 1000 requests per hour
 */
const apiLimiter = {
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: { error: 'API rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
  store
};

/**
 * Upload rate limiter - 10 uploads per hour
 */
const uploadLimiter = {
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Upload limit exceeded, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  store
};

/**
 * Create rate limiter middleware for Next.js
 */
function createRateLimiter(config) {
  return async (request) => {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               request.headers.get('cf-connecting-ip') || 
               'unknown';
    
    const result = checkRateLimit(ip, config);
    
    if (result.limited) {
      return new Response(JSON.stringify(config.message || { error: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetTime ? new Date(result.resetTime).toISOString() : new Date(Date.now() + config.windowMs).toISOString()
        }
      });
    }
    
    // Increment the counter
    const key = `${config.windowMs}-${ip}`;
    const now = Date.now();
    const resetTime = store.resetTime.get(key) || now + config.windowMs;
    
    if (now > resetTime) {
      store.hits.set(key, 1);
      store.resetTime.set(key, now + config.windowMs);
    } else {
      const hits = (store.hits.get(key) || 0) + 1;
      store.hits.set(key, hits);
    }
    
    return null; // No rate limit hit
  };
}

/**
 * Check if IP is rate limited
 */
function checkRateLimit(ip, config) {
  const key = `${config.windowMs}-${ip}`;
  const now = Date.now();
  const resetTime = store.resetTime.get(key) || now + config.windowMs;
  
  if (now > resetTime) {
    return { limited: false, remaining: config.max - 1 };
  }
  
  const hits = store.hits.get(key) || 0;
  
  return {
    limited: hits >= config.max,
    remaining: Math.max(0, config.max - hits),
    resetTime
  };
}

/**
 * Manual rate limiting for specific scenarios
 */
function applyRateLimit(ip, limitType = 'general') {
  const configs = {
    general: generalLimiter,
    auth: authLimiter,
    strict: strictLimiter,
    api: apiLimiter,
    upload: uploadLimiter
  };
  
  const config = configs[limitType] || generalLimiter;
  return checkRateLimit(ip, config);
}

// ES6 exports for Next.js compatibility
export {
  generalLimiter,
  authLimiter,
  strictLimiter,
  apiLimiter,
  uploadLimiter,
  createRateLimiter,
  checkRateLimit,
  applyRateLimit
};