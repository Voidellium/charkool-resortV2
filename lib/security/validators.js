import validator from 'validator';
import xss from 'xss';

/**
 * Input validation and sanitization utilities
 * Protects against XSS, SQL Injection, and malicious input
 */

// Safe URL whitelist for SSRF protection
const ALLOWED_DOMAINS = [
  'stripe.com',
  'api.stripe.com',
  'sendgrid.com',
  'api.sendgrid.com',
  'resend.com',
  'api.resend.com',
  'charkool-resort.vercel.app',
  'charkoolresort.com',
  'localhost'
];

/**
 * Validates and sanitizes email input
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }
  
  const sanitized = validator.escape(email.trim().toLowerCase());
  
  if (!validator.isEmail(sanitized)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  if (sanitized.length > 254) {
    return { isValid: false, error: 'Email too long' };
  }
  
  return { isValid: true, value: sanitized };
}

/**
 * Validates and sanitizes string input
 */
function validateString(input, options = {}) {
  const { 
    minLength = 0, 
    maxLength = 1000, 
    allowHTML = false,
    required = false 
  } = options;
  
  if (!input) {
    return required 
      ? { isValid: false, error: 'Field is required' }
      : { isValid: true, value: '' };
  }
  
  if (typeof input !== 'string') {
    return { isValid: false, error: 'Must be a string' };
  }
  
  let sanitized = input.trim();
  
  // Length validation
  if (sanitized.length < minLength) {
    return { isValid: false, error: `Minimum length is ${minLength}` };
  }
  
  if (sanitized.length > maxLength) {
    return { isValid: false, error: `Maximum length is ${maxLength}` };
  }
  
  // XSS protection
  if (!allowHTML) {
    sanitized = validator.escape(sanitized);
  } else {
    sanitized = xss(sanitized, {
      whiteList: {
        p: [],
        br: [],
        strong: [],
        em: [],
        u: [],
        ol: [],
        ul: [],
        li: []
      }
    });
  }
  
  return { isValid: true, value: sanitized };
}

/**
 * Validates numeric input
 */
function validateNumber(input, options = {}) {
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
  
  if (num < min) {
    return { isValid: false, error: `Minimum value is ${min}` };
  }
  
  if (num > max) {
    return { isValid: false, error: `Maximum value is ${max}` };
  }
  
  return { isValid: true, value: num };
}

/**
 * Validates date input
 */
function validateDate(input) {
  if (!input) {
    return { isValid: false, error: 'Date is required' };
  }
  
  const date = new Date(input);
  
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }
  
  // Check for reasonable date range (not too far in past/future)
  const now = new Date();
  const minDate = new Date('1900-01-01');
  const maxDate = new Date(now.getFullYear() + 10, 11, 31);
  
  if (date < minDate || date > maxDate) {
    return { isValid: false, error: 'Date is out of valid range' };
  }
  
  return { isValid: true, value: date };
}

/**
 * Validates URL input (SSRF protection)
 */
function validateURL(input) {
  if (!input || typeof input !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }
  
  const sanitized = input.trim();
  
  if (!validator.isURL(sanitized)) {
    return { isValid: false, error: 'Invalid URL format' };
  }
  
  try {
    const url = new URL(sanitized);
    
    // Only allow HTTPS (except localhost for development)
    if (url.protocol !== 'https:' && !url.hostname.includes('localhost')) {
      return { isValid: false, error: 'Only HTTPS URLs are allowed' };
    }
    
    // Check against whitelist
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      url.hostname === domain || url.hostname.endsWith('.' + domain)
    );
    
    if (!isAllowed) {
      return { isValid: false, error: 'Domain not allowed' };
    }
    
    return { isValid: true, value: sanitized };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL' };
  }
}

/**
 * Validates file path (Path Traversal protection)
 */
function validateFilePath(input) {
  if (!input || typeof input !== 'string') {
    return { isValid: false, error: 'File path is required' };
  }
  
  const sanitized = input.trim();
  
  // Check for path traversal attempts
  if (sanitized.includes('..') || 
      sanitized.includes('~') || 
      sanitized.includes('\\') ||
      sanitized.startsWith('/etc/') ||
      sanitized.startsWith('/proc/') ||
      sanitized.startsWith('/sys/')) {
    return { isValid: false, error: 'Invalid file path' };
  }
  
  // Only allow specific file extensions
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'];
  const hasValidExtension = allowedExtensions.some(ext => 
    sanitized.toLowerCase().endsWith(ext)
  );
  
  if (!hasValidExtension) {
    return { isValid: false, error: 'File type not allowed' };
  }
  
  return { isValid: true, value: sanitized };
}

/**
 * Validates request headers (CRLF Injection protection)
 */
function validateHeaders(headers) {
  const dangerousChars = /[\r\n\0]/;
  const errors = [];
  
  Object.entries(headers).forEach(([key, value]) => {
    if (dangerousChars.test(key) || dangerousChars.test(value)) {
      errors.push(`Invalid characters in header: ${key}`);
    }
    
    // Check header length
    if (key.length > 100 || (typeof value === 'string' && value.length > 4000)) {
      errors.push(`Header too long: ${key}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generic object validation with schema
 */
function validateObject(obj, schema) {
  const errors = [];
  const sanitized = {};
  
  // Check required fields
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
          result = validateDate(value);
          break;
        case 'url':
          result = validateURL(value);
          break;
        case 'filepath':
          result = validateFilePath(value);
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

// ES6 exports for Next.js compatibility
export {
  validateEmail,
  validateString,
  validateNumber,
  validateDate,
  validateURL,
  validateFilePath,
  validateHeaders,
  validateObject
};