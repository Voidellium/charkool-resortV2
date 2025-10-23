import prisma from './prisma';

/**
 * Centralized logging utility for system-wide error tracking
 * Automatically logs errors to the SystemLog database
 */

export const LogLevel = {
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

export const LogCategory = {
  API: 'API',
  AUTH: 'AUTH',
  PAYMENT: 'PAYMENT',
  DATABASE: 'DATABASE',
  UPLOAD: 'UPLOAD',
  BOOKING: 'BOOKING',
  SYSTEM: 'SYSTEM',
  SECURITY: 'SECURITY',
  CACHE: 'CACHE',
  EMAIL: 'EMAIL'
};

/**
 * Log an event to the system log
 * @param {Object} options - Logging options
 * @param {string} options.level - Log level (ERROR, WARNING, INFO, DEBUG)
 * @param {string} options.category - Category of the log
 * @param {string} options.message - Log message
 * @param {Error} [options.error] - Error object (for stack trace)
 * @param {string} [options.endpoint] - API endpoint that triggered the log
 * @param {number} [options.userId] - User ID who triggered the event
 * @param {string} [options.userRole] - User role
 * @param {string} [options.ipAddress] - IP address
 * @param {string} [options.userAgent] - User agent string
 * @param {Object} [options.metadata] - Additional metadata
 */
export async function logEvent({
  level,
  category,
  message,
  error = null,
  endpoint = null,
  userId = null,
  userRole = null,
  ipAddress = null,
  userAgent = null,
  metadata = null
}) {
  try {
    // Extract stack trace from error if provided
    const stackTrace = error?.stack || null;

    await prisma.systemLog.create({
      data: {
        level,
        category,
        message,
        stackTrace,
        endpoint,
        userId,
        userRole,
        ipAddress,
        userAgent,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
      }
    });
  } catch (logError) {
    // If logging fails, at least console.error it
    console.error('Failed to write to SystemLog:', logError);
    console.error('Original log data:', { level, category, message, error });
  }
}

/**
 * Log an error
 */
export async function logError(message, error, context = {}) {
  return logEvent({
    level: LogLevel.ERROR,
    category: context.category || LogCategory.SYSTEM,
    message,
    error,
    ...context
  });
}

/**
 * Log a warning
 */
export async function logWarning(message, context = {}) {
  return logEvent({
    level: LogLevel.WARNING,
    category: context.category || LogCategory.SYSTEM,
    message,
    ...context
  });
}

/**
 * Log an info message
 */
export async function logInfo(message, context = {}) {
  return logEvent({
    level: LogLevel.INFO,
    category: context.category || LogCategory.SYSTEM,
    message,
    ...context
  });
}

/**
 * Log a debug message
 */
export async function logDebug(message, context = {}) {
  return logEvent({
    level: LogLevel.DEBUG,
    category: context.category || LogCategory.SYSTEM,
    message,
    ...context
  });
}

/**
 * Helper to extract request info from Next.js request
 */
export function extractRequestInfo(request) {
  const headers = request.headers;
  return {
    ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown',
    userAgent: headers.get('user-agent') || 'unknown',
    endpoint: request.url || 'unknown'
  };
}
