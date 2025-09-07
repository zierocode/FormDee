/**
 * Simplified GAS connector with working cache
 */

import { getEnvBase, getGasBase, joinPath, setGasBase } from './gas'

// Simple but effective cache
const cache = new Map<string, { data: any; expires: number }>()
const inflight = new Map<string, Promise<any>>()

interface CacheOptions {
  ttl?: number
  force?: boolean
}

export class SimpleGasConnector {
  private buildUrl(path: string, preferEnv = false): string {
    const base = preferEnv ? getEnvBase() : getGasBase()
    return joinPath(base, path)
  }

  private getCacheKey(path: string): string {
    return `gas:${path}`
  }

  private learnFromResponse(response: Response) {
    try {
      const finalUrl = response.url
      if (finalUrl?.includes('script.googleusercontent.com/macros/echo')) {
        const u = new URL(finalUrl)
        u.searchParams.delete('op')
        u.searchParams.delete('refKey')
        u.searchParams.delete('apiKey')
        const base = `${u.origin}${u.pathname}?${u.searchParams.toString()}`
        setGasBase(base)
      }
    } catch {}
  }

  async fetch<T = any>(
    path: string,
    options: RequestInit & { cache?: CacheOptions; preferEnv?: boolean } = {}
  ): Promise<T> {
    const { cache: cacheOpts = {} as CacheOptions, preferEnv = false, ...fetchOptions } = options
    const cacheKey = this.getCacheKey(path)
    
    // Default TTLs based on operation
    const defaultTTL = path.includes('submit') ? 0 : 
                      path.includes('sheets_meta') ? 60 * 1000 : // 1 minute cache for sheet metadata
                      path.includes('refKey=') ? 5 * 60 * 1000 : 
                      30 * 1000
    
    const ttl = cacheOpts.ttl !== undefined ? cacheOpts.ttl : defaultTTL

    // Check cache
    if (!cacheOpts.force && ttl > 0) {
      const cached = cache.get(cacheKey)
      if (cached && Date.now() < cached.expires) {
        console.log(`[GAS Cache HIT] ${path}`)
        return cached.data
      }
    }

    // Deduplicate concurrent requests
    if (inflight.has(cacheKey)) {
      console.log(`[GAS Dedup] ${path}`)
      return inflight.get(cacheKey)!
    }

    const promise = this.doFetch(path, fetchOptions, preferEnv, ttl, cacheKey)
    inflight.set(cacheKey, promise)
    
    try {
      const result = await promise
      return result as T
    } finally {
      inflight.delete(cacheKey)
    }
  }

  private async doFetch<T>(
    path: string, 
    fetchOptions: RequestInit,
    preferEnv: boolean,
    ttl: number,
    cacheKey: string
  ): Promise<T> {
    const url = this.buildUrl(path, preferEnv)
    console.log(`[GAS Request] ${path}`)
    
    // Fetch with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        cache: 'no-store', // Disable browser cache, use our own
        redirect: 'follow' // Ensure redirects are followed
      })
      
      clearTimeout(timeoutId)
      this.learnFromResponse(response)
      
      // Parse response
      const contentType = response.headers.get('content-type') || ''
      let data: any
      
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        try {
          data = JSON.parse(text)
        } catch {
          throw new Error(`GAS returned non-JSON: ${text.slice(0, 200)}`)
        }
      }
      
      // Cache successful responses
      if (response.ok && ttl > 0) {
        cache.set(cacheKey, {
          data,
          expires: Date.now() + ttl
        })
        console.log(`[GAS Cache SET] ${path} (TTL: ${ttl}ms)`)
      }
      
      return data
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  clearCache() {
    cache.clear()
    console.log('[GAS] Cache cleared')
  }
}

// Singleton instance
export const gasSimple = new SimpleGasConnector()

// Helper functions matching the original API
export const gas = {
  getForms: async (refKey?: string) => {
    const apiKey = process.env.ADMIN_API_KEY || ''
    const path = refKey 
      ? `?op=forms&refKey=${encodeURIComponent(refKey)}`
      : `?op=forms&apiKey=${encodeURIComponent(apiKey)}`
    return gasSimple.fetch(path, { preferEnv: !refKey })
  },
  
  getSheetMeta: async (id: string, forceRefresh: boolean = false) => {
    const apiKey = process.env.ADMIN_API_KEY || ''
    
    // Build path with proper parameters
    let path = `?op=sheets_meta&id=${encodeURIComponent(id)}&apiKey=${encodeURIComponent(apiKey)}`
    
    // When refreshing, add cache-busting parameters for GAS
    if (forceRefresh) {
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(7)
      path += `&nocache=${timestamp}&r=${random}`
    }
    
    // Direct fetch with proper cache control
    const url = `${process.env.GAS_BASE_URL}${path}`
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': forceRefresh ? 'no-cache' : 'max-age=60'
        },
        cache: forceRefresh ? 'no-store' : 'default',
        redirect: 'follow'
      })
      
      if (!response.ok) {
        throw new Error(`GAS returned status ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Sheet metadata fetch failed:', error)
      throw error
    }
  },
  
  submitForm: async (data: any) => {
    return gasSimple.fetch('?op=submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      preferEnv: true
    })
  },
  
  saveForm: async (data: any) => {
    const apiKey = process.env.ADMIN_API_KEY || ''
    return gasSimple.fetch(`?op=forms&apiKey=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(data),
      preferEnv: true
    })
  },
  
  clearCache: () => gasSimple.clearCache()
}