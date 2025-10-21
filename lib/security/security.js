import { validateHeaders, validateObject } from './validators.js';
import { createRateLimiter, generalLimiter, authLimiter, strictLimiter } from './rate-limiter.js';
import { NextResponse } from 'next/server';

/**
 * Security middleware for Next.js API routes
 * Provides comprehensive protection against common web vulnerabilities
 */

/**
 * Security headers configuration
 */
const securityHeaders = {
  // XSS Protection
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  
  // HTTPS enforcement (except localhost)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.stripe.com https://api.sendgrid.com https://api.resend.com wss:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Feature policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response, isLocalhost = false) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    // Skip HTTPS enforcement on localhost
    if (key === 'Strict-Transport-Security' && isLocalhost) {
      return;
    }
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Main security wrapper for API routes
 */
function withSecurity(handler, options = {}) {
  const {
    rateLimit = 'general',
    validateInput = true,
    schema = null,
    requireAuth = false
  } = options;
  
  return async function secureHandler(request, context) {
    try {
      // Get client IP
      const clientIP = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      request.headers.get('cf-connecting-ip') ||
                      'unknown';
      
      // Check if localhost for security header adjustments
      const isLocalhost = request.url.includes('localhost') || 
                         request.url.includes('127.0.0.1');
      
      // 1. Rate limiting
      if (rateLimit) {
        const limiterConfig = {
          general: generalLimiter,
          auth: authLimiter,
          strict: strictLimiter
        }[rateLimit] || generalLimiter;
        
        const rateLimiter = createRateLimiter(limiterConfig);
        const rateLimitResult = await rateLimiter(request, {});
        
        if (rateLimitResult) {
          return applySecurityHeaders(rateLimitResult, isLocalhost);
        }
      }
      
      // 2. Header validation (CRLF injection protection)
      const headerValidation = validateHeaders(Object.fromEntries(request.headers.entries()));
      if (!headerValidation.isValid) {
        return applySecurityHeaders(
          NextResponse.json(
            { error: 'Invalid headers detected', details: headerValidation.errors },
            { status: 400 }
          ),
          isLocalhost
        );
      }
      
      // 3. Input validation
      if (validateInput && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
        try {
          const contentType = request.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            const body = await request.json();
            
            if (schema) {
              const validation = validateObject(body, schema);
              if (!validation.isValid) {
                return applySecurityHeaders(
                  NextResponse.json(
                    { error: 'Invalid input data', details: validation.errors },
                    { status: 400 }
                  ),
                  isLocalhost
                );
              }
              
              // Replace request body with sanitized data
              request.sanitizedBody = validation.data;
            }
          }
        } catch (error) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: 'Invalid JSON in request body' },
              { status: 400 }
            ),
            isLocalhost
          );
        }
      }
      
      // 4. Call original handler
      const response = await handler(request, context);
      
      // 5. Apply security headers to response
      return applySecurityHeaders(response, isLocalhost);
      
    } catch (error) {
      console.error('Security middleware error:', error);
      
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        ),
        request.url.includes('localhost')
      );
    }
  };
}

/**
 * Authentication-specific security wrapper
 */
function withAuthSecurity(handler, schema = null) {
  return withSecurity(handler, {
    rateLimit: 'auth',
    validateInput: true,
    schema,
    requireAuth: false // Let the handler deal with auth
  });
}

/**
 * Strict security for sensitive operations
 */
function withStrictSecurity(handler, schema = null) {
  return withSecurity(handler, {
    rateLimit: 'strict',
    validateInput: true,
    schema,
    requireAuth: true
  });
}

/**
 * File upload security wrapper
 */
function withUploadSecurity(handler) {
  return withSecurity(handler, {
    rateLimit: 'upload',
    validateInput: false, // Files need special handling
    requireAuth: true
  });
}

/**
 * Validation schemas for common API endpoints
 */
const commonSchemas = {
  // User registration/login
  auth: {
    email: { type: 'email', required: true },
    password: { 
      type: 'string', 
      required: true, 
      options: { minLength: 8, maxLength: 128 } 
    },
    firstName: { 
      type: 'string', 
      required: false, 
      options: { maxLength: 50 } 
    },
    lastName: { 
      type: 'string', 
      required: false, 
      options: { maxLength: 50 } 
    }
  },
  
  // Booking creation
  booking: {
    checkIn: { type: 'date', required: true },
    checkOut: { type: 'date', required: true },
    roomId: { type: 'number', required: true, options: { integer: true, min: 1 } },
    guests: { type: 'number', required: true, options: { integer: true, min: 1, max: 10 } }
  },
  
  // User profile update
  profile: {
    firstName: { type: 'string', options: { maxLength: 50 } },
    lastName: { type: 'string', options: { maxLength: 50 } },
    contactNumber: { type: 'string', options: { maxLength: 20 } },
    birthdate: { type: 'date' }
  },
  
  // Room management
  room: {
    name: { type: 'string', required: true, options: { maxLength: 100 } },
    description: { type: 'string', options: { maxLength: 1000, allowHTML: true } },
    price: { type: 'number', required: true, options: { min: 0 } },
    capacity: { type: 'number', required: true, options: { integer: true, min: 1, max: 10 } }
  },
  
  // General text content
  text: {
    title: { type: 'string', options: { maxLength: 200 } },
    content: { type: 'string', options: { maxLength: 5000, allowHTML: true } },
    description: { type: 'string', options: { maxLength: 1000 } }
  }
};

// ES6 exports for Next.js compatibility
export {
  securityHeaders,
  applySecurityHeaders,
  withSecurity,
  withAuthSecurity,
  withStrictSecurity,
  withUploadSecurity,
  commonSchemas
};