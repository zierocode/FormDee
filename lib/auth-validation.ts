import { NextRequest } from 'next/server'

const ADMIN_API_KEY = process.env.ADMIN_API_KEY
const ADMIN_UI_KEY = process.env.ADMIN_UI_KEY

export enum AuthSource {
  _HEADER = 'header',
  _COOKIE = 'cookie',
  _QUERY = 'query',
}

export enum KeyType {
  _API = 'api',
  _UI = 'ui',
  _NONE = 'none',
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
    return { key: headerKey, source: AuthSource._HEADER }
  }

  // Priority 2: Cookie (typically for UI access)
  const cookieKey = req.cookies.get('admin_key')?.value
  if (cookieKey) {
    return { key: cookieKey, source: AuthSource._COOKIE }
  }

  // Priority 3: Query param (for testing or simple API access)
  const queryKey = new URL(req.url).searchParams.get('adminKey')
  if (queryKey) {
    return { key: queryKey, source: AuthSource._QUERY }
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
    return { isValid: false, keyType: KeyType._NONE, source: null, key: null }
  }

  // If no specific types requested, enforce strict separation based on source
  if (!allowedTypes) {
    // Headers should use API key ONLY
    if (source === AuthSource._HEADER) {
      allowedTypes = [KeyType._API]
    }
    // Cookies should use UI key ONLY
    else if (source === AuthSource._COOKIE) {
      allowedTypes = [KeyType._UI]
    }
    // Query params should use API key ONLY for API endpoints
    // NO BACKWARD COMPATIBILITY - STRICT ENFORCEMENT
    else {
      allowedTypes = [KeyType._API]
    }
  }

  // Check if it's an API key
  if (ADMIN_API_KEY && key === ADMIN_API_KEY) {
    const isAllowed = allowedTypes.includes(KeyType._API)
    return {
      isValid: isAllowed,
      keyType: KeyType._API,
      source,
      key: isAllowed ? key : null,
    }
  }

  // Check if it's a UI key
  if (ADMIN_UI_KEY && key === ADMIN_UI_KEY) {
    const isAllowed = allowedTypes.includes(KeyType._UI)
    return {
      isValid: isAllowed,
      keyType: KeyType._UI,
      source,
      key: isAllowed ? key : null,
    }
  }

  return { isValid: false, keyType: KeyType._NONE, source, key: null }
}

/**
 * Validate that the request has API key (not UI key)
 */
export function validateApiKey(req: NextRequest): AuthResult {
  return validateAdminKey(req, [KeyType._API])
}

/**
 * Validate that the request has UI key (not API key)
 */
export function validateUiKey(req: NextRequest): AuthResult {
  return validateAdminKey(req, [KeyType._UI])
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
