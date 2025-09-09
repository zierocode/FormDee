import { createHash, randomBytes } from 'crypto'
import { NextRequest } from 'next/server'
import { supabase } from './supabase'

// Types
export interface ApiKey {
  id: string
  key_type: 'api' | 'ui'
  name: string
  permissions: any
  rate_limit_per_minute: number
}

export interface ValidationResult {
  isValid: boolean
  keyId?: string
  keyType?: 'api' | 'ui'
  permissions?: any
  rateLimitRemaining?: number
  error?: string
}

export interface RateLimitCheck {
  is_allowed: boolean
  requests_in_last_minute: number
  requests_in_last_hour: number
  rate_limit_per_minute: number
  rate_limit_per_hour: number
}

/**
 * Generate a new API key
 * For API: random string with no prefix
 * For UI: accepts any custom string
 */
export function generateApiKey(
  _type: 'api' | 'ui',
  customKey?: string
): { key: string; hash: string; prefix: string } {
  let key: string

  if (customKey) {
    // Use custom key (typically for UI keys)
    key = customKey
  } else {
    // Generate random key (typically for API keys)
    key = randomBytes(32).toString('base64url')
  }

  const hash = createHash('sha256').update(key).digest('hex')
  const prefix = key.substring(0, 8) // First 8 chars for identification

  return {
    key, // The actual key to give to user (only shown once!)
    hash, // What we store in database
    prefix, // First part for identification
  }
}

/**
 * Hash an existing API key for storage/comparison
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Extract API key from request
 */
export function extractApiKey(req: NextRequest): string | null {
  // Check header first (priority)
  const headerKey =
    req.headers.get('x-api-key') ||
    req.headers.get('x-admin-key') ||
    req.headers.get('authorization')?.replace('Bearer ', '')

  if (headerKey) return headerKey

  // Check cookie (for UI)
  const cookieKey = req.cookies.get('admin_key')?.value
  if (cookieKey) return cookieKey

  // Check query param (lowest priority)
  const queryKey = new URL(req.url).searchParams.get('adminKey')
  if (queryKey) return queryKey

  return null
}

/**
 * Validate API key against Supabase
 */
export async function validateApiKey(
  key: string,
  requiredType?: 'api' | 'ui'
): Promise<ValidationResult> {
  try {
    // Hash the provided key
    const keyHash = hashApiKey(key)

    // Call Supabase function to validate
    const { data, error } = await supabase
      .rpc('validate_api_key', {
        p_key_hash: keyHash,
        p_key_type: requiredType || null,
      })
      .single()

    if (error || !data) {
      return {
        isValid: false,
        error: 'Invalid API key',
      }
    }

    if (!(data as any).is_valid) {
      return {
        isValid: false,
        error: 'API key is expired or inactive',
      }
    }

    // Check rate limits
    const rateLimitCheck = await checkRateLimit((data as any).key_id)

    if (!rateLimitCheck.is_allowed) {
      return {
        isValid: false,
        error: `Rate limit exceeded: ${rateLimitCheck.requests_in_last_minute}/${rateLimitCheck.rate_limit_per_minute} requests per minute`,
      }
    }

    return {
      isValid: true,
      keyId: (data as any).key_id,
      keyType: (data as any).key_type,
      permissions: (data as any).permissions,
      rateLimitRemaining:
        rateLimitCheck.rate_limit_per_minute - rateLimitCheck.requests_in_last_minute,
    }
  } catch (error) {
    console.error('Error validating API key:', error)
    return {
      isValid: false,
      error: 'Authentication service error',
    }
  }
}

/**
 * Check rate limits for an API key
 */
export async function checkRateLimit(keyId: string): Promise<RateLimitCheck> {
  try {
    const { data, error } = await supabase
      .rpc('check_rate_limit', {
        p_api_key_id: keyId,
      })
      .single()

    if (error || !data) {
      // If error, be safe and deny
      return {
        is_allowed: false,
        requests_in_last_minute: 999,
        requests_in_last_hour: 999,
        rate_limit_per_minute: 60,
        rate_limit_per_hour: 1000,
      }
    }

    return data as RateLimitCheck
  } catch (error) {
    console.error('Error checking rate limit:', error)
    // Default to denying on error
    return {
      is_allowed: false,
      requests_in_last_minute: 999,
      requests_in_last_hour: 999,
      rate_limit_per_minute: 60,
      rate_limit_per_hour: 1000,
    }
  }
}

/**
 * Log API key usage (for audit trail)
 */
export async function logApiKeyUsage(
  keyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  ipAddress: string,
  userAgent: string,
  responseTimeMs?: number,
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.rpc('log_api_key_usage', {
      p_api_key_id: keyId,
      p_endpoint: endpoint,
      p_method: method,
      p_status_code: statusCode,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_response_time_ms: responseTimeMs || null,
      p_error_message: errorMessage || null,
    })
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Error logging API key usage:', error)
  }
}

/**
 * Create a new API key in database
 */
export async function createApiKey(
  type: 'api' | 'ui',
  name: string,
  description?: string,
  expiresInDays?: number,
  createdBy?: string
): Promise<{ key: string; id: string } | null> {
  try {
    const { key, hash, prefix } = generateApiKey(type)

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null

    const { data, error } = await supabase
      .from('ApiKeys')
      .insert({
        key_hash: hash,
        key_prefix: prefix,
        key_type: type,
        name,
        description,
        expires_at: expiresAt,
        created_by: createdBy || 'system',
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error('Error creating API key:', error)
      return null
    }

    return {
      key, // Return the actual key (only shown once!)
      id: data.id,
    }
  } catch (error) {
    console.error('Error creating API key:', error)
    return null
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  keyId: string,
  revokedBy: string,
  reason?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ApiKeys')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy,
        revoke_reason: reason,
      })
      .eq('id', keyId)

    return !error
  } catch (error) {
    console.error('Error revoking API key:', error)
    return false
  }
}

/**
 * List all active API keys (for management UI)
 */
export async function listApiKeys(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('ActiveApiKeys')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error listing API keys:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error listing API keys:', error)
    return []
  }
}

/**
 * Middleware function for API routes
 */
export async function withApiAuth(req: NextRequest, requiredType: 'api' | 'ui' | 'any' = 'api') {
  const startTime = Date.now()
  const key = extractApiKey(req)

  if (!key) {
    return {
      authenticated: false,
      error: 'No API key provided',
    }
  }

  const validation = await validateApiKey(key, requiredType === 'any' ? undefined : requiredType)

  if (!validation.isValid) {
    return {
      authenticated: false,
      error: validation.error || 'Invalid API key',
    }
  }

  // Log the usage (async, don't wait)
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const endpoint = new URL(req.url).pathname

  // Fire and forget logging
  logApiKeyUsage(
    validation.keyId!,
    endpoint,
    req.method,
    200, // Will be updated by response
    ip,
    userAgent,
    Date.now() - startTime
  )

  return {
    authenticated: true,
    keyId: validation.keyId,
    keyType: validation.keyType,
    permissions: validation.permissions,
    rateLimitRemaining: validation.rateLimitRemaining,
  }
}
