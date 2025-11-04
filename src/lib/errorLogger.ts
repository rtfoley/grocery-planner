// src/lib/errorLogger.ts

interface ErrorContext {
  action?: string;
  userId?: string;
  groupId?: string;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Sanitize context to remove sensitive data before logging
 * NEVER log: passwords, tokens, API keys, session data
 */
function sanitizeContext(context?: ErrorContext): ErrorContext {
  if (!context) return {};

  const sanitized = { ...context };

  // Remove sensitive fields
  const sensitiveKeys = ['password', 'token', 'apiKey', 'api_key', 'session', 'cookie'];
  sensitiveKeys.forEach(key => {
    if (key in sanitized) {
      delete sanitized[key];
    }
  });

  return sanitized;
}

/**
 * Centralized error logging utility
 * Logs errors to console (captured by Vercel) with structured context
 *
 * SECURITY: Only logs to server-side console (Vercel logs)
 * Users cannot see these logs in their browser
 */
export function logError(error: unknown, context?: ErrorContext): void {
  const timestamp = new Date().toISOString();

  // Build error message with context
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Structure the log entry for better searchability in Vercel logs
  const logEntry = {
    timestamp,
    level: 'error',
    message: errorMessage,
    stack: errorStack,
    context: sanitizeContext(context),
    environment: process.env.NODE_ENV,
  };

  // Log to console - Vercel automatically captures this
  // This only appears in server logs, NOT in browser console
  console.error('[ERROR]', JSON.stringify(logEntry, null, 2));

  // Future: Add integration with external services like Sentry
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  //   Sentry.captureException(error, { contexts: { custom: context } });
  // }
}

/**
 * Log warning-level issues that don't throw errors
 */
export function logWarning(message: string, context?: ErrorContext): void {
  const timestamp = new Date().toISOString();

  const logEntry = {
    timestamp,
    level: 'warning',
    message,
    context: sanitizeContext(context),
    environment: process.env.NODE_ENV,
  };

  console.warn('[WARNING]', JSON.stringify(logEntry, null, 2));
}

/**
 * Log info-level messages for debugging
 */
export function logInfo(message: string, context?: ErrorContext): void {
  // Only log info in development
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();

    const logEntry = {
      timestamp,
      level: 'info',
      message,
      context: sanitizeContext(context),
      environment: process.env.NODE_ENV,
    };

    console.log('[INFO]', JSON.stringify(logEntry, null, 2));
  }
}
