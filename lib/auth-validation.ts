import { NextRequest } from 'next/server'

const ADMIN_API_KEY = process.env.ADMIN_API_KEY
const ADMIN_UI_KEY = process.env.ADMIN_UI_KEY

export enum AuthSource {
  HEADER = 'header',
  COOKIE = 'cookie',
  QUERY = 'query',
}

export enum KeyType {
  API = 'api',
  UI = 'ui',
  NONE = 'none',
}

export interface AuthResult {
  isValid: boolean
  keyType: KeyType
  source: AuthSource | null
  key: string | null
}

/**
 * Extract the authentication key from the request
 */
function extractAuthKey(req: NextRequest): { key: string | null; source: AuthSource | null } {
  // Priority 1: Header (typically for API access)
  const headerKey = req.headers.get('x-admin-key') || req.headers.get('x-api-key')
  if (headerKey) {
    return { key: headerKey, source: AuthSource.HEADER }
  }

  // Priority 2: Cookie (typically for UI access)
  const cookieKey = req.cookies.get('admin_key')?.value
  if (cookieKey) {
    return { key: cookieKey, source: AuthSource.COOKIE }
  }

  // Priority 3: Query param (for testing or simple API access)
  const queryKey = new URL(req.url).searchParams.get('adminKey')
  if (queryKey) {
    return { key: queryKey, source: AuthSource.QUERY }
  }

  return { key: null, source: null }
}

/**
 * Validate admin key with strict separation between UI and API keys
 * @param req - Next.js request object
 * @param allowedTypes - Which key types to accept (defaults to strict based on source)
 */
export function validateAdminKey(req: NextRequest, allowedTypes?: KeyType[]): AuthResult {
  const { key, source } = extractAuthKey(req)

  if (!key || !source) {
    return { isValid: false, keyType: KeyType.NONE, source: null, key: null }
  }

  // If no specific types requested, enforce strict separation based on source
  if (!allowedTypes) {
    // Headers should use API key ONLY
    if (source === AuthSource.HEADER) {
      allowedTypes = [KeyType.API]
    }
    // Cookies should use UI key ONLY
    else if (source === AuthSource.COOKIE) {
      allowedTypes = [KeyType.UI]
    }
    // Query params should use API key ONLY for API endpoints
    // NO BACKWARD COMPATIBILITY - STRICT ENFORCEMENT
    else {
      allowedTypes = [KeyType.API]
    }
  }

  // Check if it's an API key
  if (ADMIN_API_KEY && key === ADMIN_API_KEY) {
    const isAllowed = allowedTypes.includes(KeyType.API)
    return {
      isValid: isAllowed,
      keyType: KeyType.API,
      source,
      key: isAllowed ? key : null,
    }
  }

  // Check if it's a UI key
  if (ADMIN_UI_KEY && key === ADMIN_UI_KEY) {
    const isAllowed = allowedTypes.includes(KeyType.UI)
    return {
      isValid: isAllowed,
      keyType: KeyType.UI,
      source,
      key: isAllowed ? key : null,
    }
  }

  return { isValid: false, keyType: KeyType.NONE, source, key: null }
}

/**
 * Validate that the request has API key (not UI key)
 */
export function validateApiKey(req: NextRequest): AuthResult {
  return validateAdminKey(req, [KeyType.API])
}

/**
 * Validate that the request has UI key (not API key)
 */
export function validateUiKey(req: NextRequest): AuthResult {
  return validateAdminKey(req, [KeyType.UI])
}

/**
 * Check if request is from browser (has UI key in cookie)
 */
export function isBrowserRequest(req: NextRequest): boolean {
  const cookieKey = req.cookies.get('admin_key')?.value
  return !!cookieKey && cookieKey === ADMIN_UI_KEY
}

/**
 * Check if request is from API client (has API key in header)
 */
export function isApiRequest(req: NextRequest): boolean {
  const headerKey = req.headers.get('x-admin-key') || req.headers.get('x-api-key')
  return !!headerKey && headerKey === ADMIN_API_KEY
}
