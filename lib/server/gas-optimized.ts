import { apiClient, RequestOptions } from './api-client'
import { getEnvBase, getGasBase, joinPath, setGasBase } from './gas'

interface GasRequestOptions extends Omit<RequestOptions, 'cache'> {
  preferEnv?: boolean
  cache?: {
    ttl?: number
    force?: boolean
  }
}

interface GasMetrics {
  totalRequests: number
  cachedRequests: number
  failedRequests: number
  averageResponseTime: number
  lastError?: string
  lastErrorAt?: Date
}

/**
 * Optimized Google Apps Script connector with performance enhancements
 */
export class GasConnector {
  private metrics: GasMetrics = {
    totalRequests: 0,
    cachedRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0
  }

  private responseTimes: number[] = []
  private maxMetricSamples = 100

  /**
   * Build GAS URL with intelligent base selection
   */
  private buildUrl(path: string, preferEnv = false): string {
    const base = preferEnv ? getEnvBase() : getGasBase()
    return joinPath(base, path)
  }

  /**
   * Learn from response to optimize future requests
   */
  private learnFromResponse(response: Response, startTime: number) {
    // Track response time
    const responseTime = Date.now() - startTime
    this.responseTimes.push(responseTime)
    if (this.responseTimes.length > this.maxMetricSamples) {
      this.responseTimes.shift()
    }
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length

    // Learn googleusercontent echo base for faster subsequent requests
    try {
      const finalUrl = response.url
      if (finalUrl?.includes('script.googleusercontent.com/macros/echo')) {
        const u = new URL(finalUrl)
        // Remove dynamic params
        u.searchParams.delete('op')
        u.searchParams.delete('refKey')
        u.searchParams.delete('apiKey')
        const base = `${u.origin}${u.pathname}?${u.searchParams.toString()}`
        setGasBase(base)
        console.log('[GAS] Learned optimized base URL')
      }
    } catch (error) {
      console.error('[GAS] Failed to learn from response:', error)
    }
  }

  /**
   * Fetch with GAS-specific optimizations
   */
  async fetch<T = any>(path: string, options: GasRequestOptions = {}): Promise<T> {
    const { preferEnv = false, cache = {}, ...fetchOptions } = options
    const url = this.buildUrl(path, preferEnv)
    const startTime = Date.now()

    this.metrics.totalRequests++

    try {
      // Direct fetch with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId))

      this.learnFromResponse(response, startTime)

      // Parse response based on content type
      const contentType = response.headers.get('content-type') || ''
      let data: any
      
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        // Try to parse as JSON anyway (some GAS responses have wrong content-type)
        try {
          data = JSON.parse(text)
        } catch {
          throw new Error(`GAS returned non-JSON response: ${text.slice(0, 200)}`)
        }
      }

      return data
    } catch (error: any) {
      this.metrics.failedRequests++
      this.metrics.lastError = error.message
      this.metrics.lastErrorAt = new Date()
      throw error
    }
  }

  /**
   * Batch multiple GAS operations
   */
  async batchFetch<T = any>(
    operations: Array<{
      path: string
      options?: GasRequestOptions
    }>
  ): Promise<T[]> {
    return Promise.all(
      operations.map(({ path, options }) => this.fetch<T>(path, options))
    )
  }

  /**
   * Get forms with optimized caching
   */
  async getForms(refKey?: string, options: GasRequestOptions = {}) {
    const path = refKey 
      ? `?op=forms&refKey=${encodeURIComponent(refKey)}`
      : '?op=forms'
    
    return this.fetch(path, {
      ...options,
      cache: {
        ttl: refKey ? 5 * 60 * 1000 : 30 * 1000, // 5 min for specific, 30s for list
        ...options.cache
      }
    })
  }

  /**
   * Get sheet metadata with extended caching
   */
  async getSheetMeta(id: string, options: GasRequestOptions = {}) {
    const apiKey = process.env.ADMIN_API_KEY || ''
    const path = `?op=sheets_meta&id=${encodeURIComponent(id)}&apiKey=${encodeURIComponent(apiKey)}`
    
    return this.fetch(path, {
      ...options,
      preferEnv: true, // Always use env base for sheets_meta
      cache: {
        ttl: 10 * 60 * 1000, // 10 minutes cache
        ...options.cache
      }
    })
  }

  /**
   * Submit form with no caching
   */
  async submitForm(data: any, options: GasRequestOptions = {}) {
    return this.fetch('?op=submit', {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      preferEnv: true, // Always use env base for POST
      cache: {
        ttl: 0, // Never cache submissions
        ...options.cache
      }
    })
  }

  /**
   * Save form configuration
   */
  async saveForm(data: any, options: GasRequestOptions = {}) {
    const apiKey = process.env.ADMIN_API_KEY || ''
    
    return this.fetch(`?op=forms&apiKey=${encodeURIComponent(apiKey)}`, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        ...options.headers
      },
      body: JSON.stringify(data),
      preferEnv: true,
      cache: {
        ttl: 0, // Never cache saves
        ...options.cache
      }
    })
  }

  /**
   * Test Slack webhook
   */
  async testSlack(refKey: string, webhookUrl: string, options: GasRequestOptions = {}) {
    const apiKey = process.env.ADMIN_API_KEY || ''
    
    return this.fetch(`?op=test_slack&apiKey=${encodeURIComponent(apiKey)}`, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        ...options.headers
      },
      body: JSON.stringify({ refKey, slackWebhookUrl: webhookUrl }),
      preferEnv: true,
      cache: {
        ttl: 0,
        ...options.cache
      }
    })
  }

  /**
   * Prefetch and warm up cache
   */
  async warmCache(refKeys: string[]) {
    console.log(`[GAS] Warming cache for ${refKeys.length} forms...`)
    
    // Batch prefetch with staggered timing to avoid overwhelming GAS
    const batchSize = 5
    for (let i = 0; i < refKeys.length; i += batchSize) {
      const batch = refKeys.slice(i, i + batchSize)
      await Promise.all(
        batch.map(refKey => 
          this.getForms(refKey, { cache: { force: true } })
            .catch(err => console.error(`[GAS] Failed to warm cache for ${refKey}:`, err))
        )
      )
      
      // Small delay between batches
      if (i + batchSize < refKeys.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log('[GAS] Cache warming complete')
  }

  /**
   * Get performance metrics
   */
  getMetrics(): GasMetrics {
    return { ...this.metrics }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    apiClient.clearCache()
    console.log('[GAS] Cache cleared')
  }
}

// Singleton instance
export const gasConnector = new GasConnector()

// Export convenience functions
export const gas = {
  getForms: (refKey?: string, options?: GasRequestOptions) => 
    gasConnector.getForms(refKey, options),
  
  getSheetMeta: (id: string, options?: GasRequestOptions) => 
    gasConnector.getSheetMeta(id, options),
  
  submitForm: (data: any, options?: GasRequestOptions) => 
    gasConnector.submitForm(data, options),
  
  saveForm: (data: any, options?: GasRequestOptions) => 
    gasConnector.saveForm(data, options),
  
  testSlack: (refKey: string, webhookUrl: string, options?: GasRequestOptions) => 
    gasConnector.testSlack(refKey, webhookUrl, options),
  
  warmCache: (refKeys: string[]) => 
    gasConnector.warmCache(refKeys),
  
  getMetrics: () => 
    gasConnector.getMetrics(),
  
  clearCache: () => 
    gasConnector.clearCache()
}