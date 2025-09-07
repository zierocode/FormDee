import { NextRequest, NextResponse } from 'next/server'

interface ApiMetrics {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  timestamp: Date
  error?: string
}

class MetricsCollector {
  private metrics: ApiMetrics[] = []
  private maxMetrics = 1000

  record(metric: ApiMetrics) {
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  getStats(endpoint?: string) {
    const filtered = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics

    if (filtered.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        statusCodes: {}
      }
    }

    const totalRequests = filtered.length
    const errors = filtered.filter(m => m.statusCode >= 400).length
    const avgResponseTime = filtered.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
    
    const statusCodes = filtered.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    return {
      totalRequests,
      averageResponseTime: Math.round(avgResponseTime),
      errorRate: (errors / totalRequests) * 100,
      statusCodes,
      recentErrors: filtered
        .filter(m => m.error)
        .slice(-10)
        .map(m => ({
          endpoint: m.endpoint,
          error: m.error,
          timestamp: m.timestamp
        }))
    }
  }

  getHealthStatus() {
    const stats = this.getStats()
    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      metrics: stats,
      timestamp: new Date()
    }

    // Determine health status
    if (stats.errorRate > 50) {
      health.status = 'unhealthy'
    } else if (stats.errorRate > 10 || stats.averageResponseTime > 5000) {
      health.status = 'degraded'
    }

    return health
  }
}

export const metricsCollector = new MetricsCollector()

/**
 * Middleware to track API performance
 */
export function withMetrics(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    const endpoint = new URL(req.url).pathname
    const method = req.method

    try {
      const response = await handler(req)
      
      metricsCollector.record({
        endpoint,
        method,
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      })

      // Add performance headers
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
      response.headers.set('X-Cache-Status', response.headers.get('X-Cache-Hit') ? 'HIT' : 'MISS')
      
      return response
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      
      metricsCollector.record({
        endpoint,
        method,
        statusCode: 500,
        responseTime,
        timestamp: new Date(),
        error: error.message
      })

      throw error
    }
  }
}

/**
 * Rate limiting middleware
 */
interface RateLimitOptions {
  windowMs?: number // Time window in milliseconds
  maxRequests?: number // Max requests per window
  keyGenerator?: (req: NextRequest) => string // Function to generate rate limit key
}

class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>()

  constructor(private options: RateLimitOptions = {}) {
    this.options.windowMs = options.windowMs || 60000 // 1 minute default
    this.options.maxRequests = options.maxRequests || 100 // 100 requests default
    this.options.keyGenerator = options.keyGenerator || ((req) => {
      // Default: rate limit by IP
      return req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown'
    })
  }

  isAllowed(req: NextRequest): boolean {
    const key = this.options.keyGenerator!(req)
    const now = Date.now()
    
    const record = this.requests.get(key)
    
    if (!record || now > record.resetTime) {
      // Create new window
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.options.windowMs!
      })
      return true
    }

    if (record.count >= this.options.maxRequests!) {
      return false
    }

    record.count++
    return true
  }

  getRemainingRequests(req: NextRequest): number {
    const key = this.options.keyGenerator!(req)
    const record = this.requests.get(key)
    
    if (!record) return this.options.maxRequests!
    
    return Math.max(0, this.options.maxRequests! - record.count)
  }

  getResetTime(req: NextRequest): number {
    const key = this.options.keyGenerator!(req)
    const record = this.requests.get(key)
    
    if (!record) return Date.now() + this.options.windowMs!
    
    return record.resetTime
  }

  getOptions(): RateLimitOptions {
    return this.options
  }

  // Cleanup old entries
  cleanup() {
    const now = Date.now()
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key)
      }
    }
  }
}

// Create rate limiters for different endpoints
export const rateLimiters = {
  forms: new RateLimiter({ maxRequests: 100, windowMs: 60000 }), // 100/min
  submit: new RateLimiter({ maxRequests: 20, windowMs: 60000 }), // 20/min
  sheets: new RateLimiter({ maxRequests: 50, windowMs: 60000 }), // 50/min
}

// Cleanup old rate limit entries every minute
setInterval(() => {
  Object.values(rateLimiters).forEach(limiter => limiter.cleanup())
}, 60000)

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  limiter: RateLimiter,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    if (!limiter.isAllowed(req)) {
      const resetTime = limiter.getResetTime(req)
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
      
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: '429',
            message: 'Too many requests. Please try again later.'
          }
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limiter.getOptions().maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetTime),
            'Retry-After': String(retryAfter)
          }
        }
      )
    }

    const response = await handler(req)
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(limiter.getOptions().maxRequests))
    response.headers.set('X-RateLimit-Remaining', String(limiter.getRemainingRequests(req)))
    response.headers.set('X-RateLimit-Reset', String(limiter.getResetTime(req)))
    
    return response
  }
}

/**
 * Compression middleware for large responses
 */
export function withCompression(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req)
    
    // Note: Next.js handles compression automatically
    // We don't need to set Content-Encoding headers manually
    // Just set Vary header to indicate response varies based on Accept-Encoding
    response.headers.set('Vary', 'Accept-Encoding')
    
    return response
  }
}

/**
 * Combined middleware stack
 */
export function withApiMiddleware(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    metrics?: boolean
    rateLimit?: RateLimiter
    compression?: boolean
  } = {}
) {
  let wrappedHandler = handler

  if (options.compression) {
    wrappedHandler = withCompression(wrappedHandler)
  }

  if (options.rateLimit) {
    wrappedHandler = withRateLimit(options.rateLimit, wrappedHandler)
  }

  if (options.metrics !== false) {
    wrappedHandler = withMetrics(wrappedHandler)
  }

  return wrappedHandler
}