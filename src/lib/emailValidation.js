/**
 * Utility functions for email domain validation
 */

/**
 * List of allowed email domains for registration
 */
const ALLOWED_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'icloud.com',
  'hotmail.com',
  'charkoolresort.com' // Company domain
];

/**
 * Validates if an email domain is allowed for registration
 * @param {string} email - The email address to validate
 * @returns {boolean} - True if domain is allowed, false otherwise
 */
export function isDomainAllowed(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailLower = email.toLowerCase().trim();
  const domain = emailLower.split('@')[1];

  if (!domain) {
    return false;
  }

  return ALLOWED_DOMAINS.includes(domain);
}

/**
 * Gets the domain from an email address
 * @param {string} email - The email address
 * @returns {string|null} - The domain or null if invalid
 */
export function getEmailDomain(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const emailLower = email.toLowerCase().trim();
  const domain = emailLower.split('@')[1];

  return domain || null;
}

/**
 * Validates email format and domain
 * @param {string} email - The email address to validate
 * @returns {object} - Validation result with isValid and error message
 */
export function validateEmailWithDomain(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email is required'
    };
  }

  const emailTrimmed = email.trim();

  if (!emailRegex.test(emailTrimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }

  if (!isDomainAllowed(emailTrimmed)) {
    const domain = getEmailDomain(emailTrimmed);
    return {
      isValid: false,
      error: `Email domain '${domain}' is not allowed. Only the following domains are permitted: ${ALLOWED_DOMAINS.join(', ')}`
    };
  }

  return {
    isValid: true,
    error: null
  };
}
