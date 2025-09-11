import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '100')

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  // Get client IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'

  // Rate limiting for public API endpoints
  if (
    request.nextUrl.pathname.startsWith('/api/submit') ||
    request.nextUrl.pathname.startsWith('/api/upload')
  ) {
    const now = Date.now()
    const clientData = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW }

    // Reset if window has passed
    if (now > clientData.resetTime) {
      clientData.count = 0
      clientData.resetTime = now + RATE_LIMIT_WINDOW
    }

    // Increment request count
    clientData.count++
    rateLimitMap.set(ip, clientData)

    // Check if rate limit exceeded
    if (clientData.count > RATE_LIMIT_MAX) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((clientData.resetTime - now) / 1000)),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString(),
          },
        }
      )
    }

    // Add rate limit headers to response
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX))
    response.headers.set('X-RateLimit-Remaining', String(RATE_LIMIT_MAX - clientData.count))
    response.headers.set('X-RateLimit-Reset', new Date(clientData.resetTime).toISOString())
    return response
  }

  // Security headers for API responses
  const response = NextResponse.next()

  // CORS headers for API
  if (request.method === 'OPTIONS') {
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_BASE_URL || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
    response.headers.set('Access-Control-Max-Age', '86400')
  }

  return response
}

// Clean up old rate limit entries periodically
declare global {
  // eslint-disable-next-line no-var
  var rateLimitCleanupInterval: NodeJS.Timeout | undefined
}

if (typeof global !== 'undefined' && !global.rateLimitCleanupInterval) {
  global.rateLimitCleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now > data.resetTime + RATE_LIMIT_WINDOW) {
        rateLimitMap.delete(ip)
      }
    }
  }, RATE_LIMIT_WINDOW)
}

export const config = {
  matcher: ['/api/:path*'],
}
