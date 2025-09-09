import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { validateApiKey as validateSupabaseKey } from './auth-supabase'

const COOKIE_NAME = 'admin_key'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// This function is for UI login only - validates against Supabase Auth
export async function validateAdminKey(key: string): Promise<boolean> {
  // Validate the key using Supabase Auth system
  const validation = await validateSupabaseKey(key, 'ui')
  return validation.isValid
}

export async function verifyApiKey(
  request: NextRequest
): Promise<{ authorized: boolean; error?: string }> {
  const adminKey = request.headers.get('x-admin-key') || request.headers.get('x-api-key')

  if (!adminKey) {
    return { authorized: false, error: 'API key required' }
  }

  // Validate as API key using Supabase Auth
  const validation = await validateSupabaseKey(adminKey, 'api')

  if (!validation.isValid) {
    return { authorized: false, error: validation.error || 'Invalid API key' }
  }

  return { authorized: true }
}

export async function setAdminKeyCookie(key: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function getAdminKeyCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value
}

export async function removeAdminKeyCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function isAuthenticated(): Promise<boolean> {
  const key = await getAdminKeyCookie()
  if (!key) return false

  // Validate UI key from cookie using Supabase Auth
  const validation = await validateSupabaseKey(key, 'ui')
  return validation.isValid
}
