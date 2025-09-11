/**
 * Production-ready logging utility
 * Provides structured logging with different levels and contexts
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  requestId?: string
  ip?: string
  userAgent?: string
  [key: string]: any
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production'

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? JSON.stringify(context) : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${contextStr}`
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log info and above
    if (this.isProduction) {
      return ['info', 'warn', 'error'].includes(level)
    }
    // In development, log everything
    return true
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.log(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.log(this.formatMessage('info', message, context))
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      // eslint-disable-next-line no-console
      console.warn(this.formatMessage('warn', message, context))
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorDetails =
        error instanceof Error
          ? { errorMessage: error.message, stack: error.stack }
          : { error: String(error) }

      // eslint-disable-next-line no-console
      console.error(this.formatMessage('error', message, { ...context, ...errorDetails }))

      // In production, you might want to send errors to a monitoring service
      if (this.isProduction && process.env.NEXT_PUBLIC_SENTRY_DSN) {
        // This is where you'd send to Sentry or similar service
        // Example: Sentry.captureException(error)
      }
    }
  }

  // Log API requests
  logRequest(method: string, path: string, context?: LogContext): void {
    this.info(`${method} ${path}`, context)
  }

  // Log API responses
  logResponse(
    method: string,
    path: string,
    status: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    this[level](`${method} ${path} - ${status} (${duration}ms)`, context)
  }

  // Log database queries
  logQuery(table: string, operation: string, duration?: number, context?: LogContext): void {
    this.debug(`DB ${operation} on ${table}${duration ? ` (${duration}ms)` : ''}`, context)
  }

  // Log security events
  logSecurity(event: string, context?: LogContext): void {
    this.warn(`SECURITY: ${event}`, context)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export request logging middleware helper
export function createRequestLogger(request: Request): {
  requestId: string
  startTime: number
  context: LogContext
} {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  const context: LogContext = {
    requestId,
    ip:
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    method: request.method,
    url: request.url,
  }

  return { requestId, startTime, context }
}
