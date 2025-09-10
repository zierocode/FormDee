import { retry } from '@/lib/utils'

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  key?: string // Cache key
  force?: boolean // Force bypass cache
}

export interface RequestOptions extends Omit<RequestInit, 'cache'> {
  cacheOptions?: CacheOptions
  retries?: number
  timeout?: number
}

// Enhanced cache with TTL and size limits
class ApiCache {
  private cache = new Map<string, { data: any; expires: number; size: number }>()
  private maxSize = 50 * 1024 * 1024 // 50MB max cache size
  private currentSize = 0

  set(key: string, data: any, ttl: number) {
    const str = JSON.stringify(data)
    const size = new Blob([str]).size

    // Remove old entry if exists
    if (this.cache.has(key)) {
      const old = this.cache.get(key)!
      this.currentSize -= old.size
    }

    // Evict oldest entries if cache is too large
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value
      const entry = this.cache.get(firstKey)!
      this.currentSize -= entry.size
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
      size,
    })
    this.currentSize += size
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expires) {
      this.currentSize -= entry.size
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  clear() {
    this.cache.clear()
    this.currentSize = 0
  }

  // Remove expired entries
  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.currentSize -= entry.size
        this.cache.delete(key)
      }
    }
  }
}

// Request deduplication
class RequestDeduplicator {
  private inflight = new Map<string, Promise<any>>()

  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.inflight.has(key)) {
      return this.inflight.get(key)!
    }

    const promise = fn().finally(() => {
      this.inflight.delete(key)
    })

    this.inflight.set(key, promise)
    return promise
  }
}

// Connection pool for better performance
class ConnectionPool {
  private pool: AbortController[] = []
  private maxConnections = 6 // Browser limit per domain

  acquire(): AbortController {
    // Reuse or create new controller
    const controller = this.pool.pop() || new AbortController()
    return controller
  }

  release(controller: AbortController) {
    if (this.pool.length < this.maxConnections && !controller.signal.aborted) {
      this.pool.push(controller)
    }
  }
}

// Main API client with optimizations
export class OptimizedApiClient {
  private cache = new ApiCache()
  private deduplicator = new RequestDeduplicator()
  private connectionPool = new ConnectionPool()
  private defaultTimeout = 30000 // 30 seconds
  private defaultRetries = 3

  // Default cache TTLs for different operations
  private defaultTTLs = {
    forms: 5 * 60 * 1000, // 5 minutes for form configs
    sheets: 10 * 60 * 1000, // 10 minutes for sheet metadata
    submit: 0, // No caching for submissions
    default: 60 * 1000, // 1 minute default
  }

  constructor() {
    // Cleanup expired cache entries every minute
    setInterval(() => this.cache.cleanup(), 60000)
  }

  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET'
    const body = options?.body ? JSON.stringify(options.body) : ''
    return `${method}:${url}:${body}`
  }

  private getOperationType(url: string): keyof typeof this.defaultTTLs {
    if (url.includes('op=forms')) return 'forms'
    if (url.includes('op=sheets')) return 'sheets'
    if (url.includes('op=submit')) return 'submit'
    return 'default'
  }

  async fetch<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
    const {
      cacheOptions = {},
      retries = this.defaultRetries,
      timeout = this.defaultTimeout,
      ...fetchOptions
    } = options

    // Determine cache key and TTL
    const cacheKey = cacheOptions.key || this.getCacheKey(url, fetchOptions)
    const opType = this.getOperationType(url)
    const ttl = cacheOptions.ttl ?? this.defaultTTLs[opType]

    // Check cache first (unless forced refresh)
    if (!cacheOptions.force && ttl > 0) {
      const cached = this.cache.get(cacheKey)
      if (cached !== null) {
        // Cache hit
        return cached
      }
    }

    // Deduplicate concurrent requests
    return this.deduplicator.dedupe(cacheKey, async () => {
      // API request

      // Execute with retry logic
      const response = await retry(
        async () => {
          const controller = this.connectionPool.acquire()

          try {
            // Add timeout
            const timeoutId = setTimeout(() => controller.abort(), timeout)

            const res = await fetch(url, {
              ...fetchOptions,
              signal: controller.signal,
            })

            clearTimeout(timeoutId)
            this.connectionPool.release(controller)

            if (!res.ok && res.status >= 500) {
              throw new Error(`Server error: ${res.status}`)
            }

            return res
          } catch (error) {
            this.connectionPool.release(controller)
            throw error
          }
        },
        {
          retries,
          delay: 1000,
          factor: 2,
          maxDelay: 10000,
          onRetry: (error, attempt) => {
            console.warn(`[Retry ${attempt}/${retries}] ${url}:`, error.message)
          },
        }
      )

      // Parse response
      const contentType = response.headers.get('content-type') || ''
      let data: any

      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      // Cache successful responses
      if (response.ok && ttl > 0) {
        this.cache.set(cacheKey, data, ttl)
        // Cache set
      }

      return data
    })
  }

  // Batch multiple requests
  async fetchBatch<T = any>(
    requests: Array<{ url: string; options?: RequestOptions }>
  ): Promise<T[]> {
    return Promise.all(requests.map(({ url, options }) => this.fetch<T>(url, options)))
  }

  // Clear cache
  clearCache() {
    this.cache.clear()
  }
}

// Singleton instance
export const apiClient = new OptimizedApiClient()
