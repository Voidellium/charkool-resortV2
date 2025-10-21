import validator from 'validator';
import { NextResponse } from 'next/server';

/**
 * Simplified security module for Next.js compatibility
 * All security functions in one file to avoid module resolution issues
 */

// Simple rate limiting store
const rateStore = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateStore.entries()) {
    if (now > data.resetTime) {
      rateStore.delete(key);
    }
  }
}, 300000);

/**
 * Input validation functions
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }
  
  const sanitized = validator.escape(email.trim().toLowerCase());
  
  if (!validator.isEmail(sanitized)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  return { isValid: true, value: sanitized };
}

export function validateString(input, options = {}) {
  const { minLength = 0, maxLength = 1000, required = false } = options;
  
  if (!input) {
    return required 
      ? { isValid: false, error: 'Field is required' }
      : { isValid: true, value: '' };
  }
  
  if (typeof input !== 'string') {
    return { isValid: false, error: 'Must be a string' };
  }
  
  const sanitized = validator.escape(input.trim());
  
  if (sanitized.length < minLength) {
    return { isValid: false, error: `Minimum length is ${minLength}` };
  }
  
  if (sanitized.length > maxLength) {
    return { isValid: false, error: `Maximum length is ${maxLength}` };
  }
  
  return { isValid: true, value: sanitized };
}

export function validateNumber(input, options = {}) {
  const { min = -Infinity, max = Infinity, integer = false } = options;
  
  if (input === undefined || input === null || input === '') {
    return { isValid: false, error: 'Number is required' };
  }
  
  const num = Number(input);
  
  if (isNaN(num) || !isFinite(num)) {
    return { isValid: false, error: 'Must be a valid number' };
  }
  
  if (integer && !Number.isInteger(num)) {
    return { isValid: false, error: 'Must be an integer' };
  }
  
  if (num < min || num > max) {
    return { isValid: false, error: `Must be between ${min} and ${max}` };
  }
  
  return { isValid: true, value: num };
}

export function validateObject(obj, schema) {
  const errors = [];
  const sanitized = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field];
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    if (value !== undefined && value !== null && value !== '') {
      let result;
      
      switch (rules.type) {
        case 'email':
          result = validateEmail(value);
          break;
        case 'string':
          result = validateString(value, rules.options);
          break;
        case 'number':
          result = validateNumber(value, rules.options);
          break;
        case 'date':
          const date = new Date(value);
          result = isNaN(date.getTime()) 
            ? { isValid: false, error: 'Invalid date' }
            : { isValid: true, value: date };
          break;
        default:
          result = { isValid: true, value };
      }
      
      if (!result.isValid) {
        errors.push(`${field}: ${result.error}`);
      } else {
        sanitized[field] = result.value;
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: sanitized
  };
}

/**
 * Rate limiting
 */
export function checkRateLimit(ip, maxRequests = 100, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const key = `${ip}-${Math.floor(now / windowMs)}`;
  const current = rateStore.get(key) || { count: 0, resetTime: now + windowMs };
  
  if (now > current.resetTime) {
    rateStore.set(key, { count: 1, resetTime: now + windowMs });
    return { limited: false, remaining: maxRequests - 1 };
  }
  
  current.count++;
  rateStore.set(key, current);
  
  return {
    limited: current.count > maxRequests,
    remaining: Math.max(0, maxRequests - current.count)
  };
}

/**
 * Security headers
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://api.sendgrid.com https://api.resend.com;"
};

export function applySecurityHeaders(response, isLocalhost = false) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  if (!isLocalhost) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

/**
 * Security wrapper for API routes
 */
export function withSecurity(handler, options = {}) {
  const { rateLimit = { max: 100, window: 15 * 60 * 1000 }, validateInput = false } = options;
  
  return async function secureHandler(request, context) {
    try {
      // Get client IP
      const clientIP = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      request.headers.get('cf-connecting-ip') ||
                      'unknown';
      
      // Rate limiting
      if (rateLimit) {
        const rateLimitResult = checkRateLimit(clientIP, rateLimit.max || 100, rateLimit.window || 15 * 60 * 1000);
        if (rateLimitResult.limited) {
          const response = NextResponse.json(
            { error: 'Too many requests, please try again later' },
            { status: 429 }
          );
          return applySecurityHeaders(response, request.url.includes('localhost'));
        }
      }
      
      // Input validation for POST/PUT/PATCH
      if (validateInput && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const contentType = request.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const body = await request.json();
            // Simple validation - reject if contains script tags or SQL keywords
            const bodyStr = JSON.stringify(body).toLowerCase();
            if (bodyStr.includes('<script') || bodyStr.includes('union select') || bodyStr.includes('drop table')) {
              return applySecurityHeaders(
                NextResponse.json({ error: 'Invalid input detected' }, { status: 400 }),
                request.url.includes('localhost')
              );
            }
            request.sanitizedBody = body;
          }
        } catch (error) {
          return applySecurityHeaders(
            NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 }),
            request.url.includes('localhost')
          );
        }
      }
      
      // Call original handler
      const response = await handler(request, context);
      
      // Apply security headers
      return applySecurityHeaders(response, request.url.includes('localhost'));
      
    } catch (error) {
      console.error('Security middleware error:', error);
      return applySecurityHeaders(
        NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
        request.url.includes('localhost')
      );
    }
  };
}

export function withAuthSecurity(handler) {
  return withSecurity(handler, { 
    rateLimit: { max: 5, window: 15 * 60 * 1000 }, 
    validateInput: true 
  });
}

export function withStrictSecurity(handler) {
  return withSecurity(handler, { 
    rateLimit: { max: 3, window: 60 * 60 * 1000 }, 
    validateInput: true 
  });
}

// Common validation schemas
export const commonSchemas = {
  auth: {
    email: { type: 'email', required: true },
    password: { type: 'string', required: true, options: { minLength: 8, maxLength: 128 } }
  },
  booking: {
    checkIn: { type: 'date', required: true },
    checkOut: { type: 'date', required: true },
    guests: { type: 'number', required: true, options: { integer: true, min: 1, max: 10 } }
  }
};