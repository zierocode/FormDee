// Client-safe auth utilities
// This file should not import any server-only modules

export const COOKIE_NAME = 'admin_key'

// Client-side helper to get cookie value
export function getCookie(name: string): string | undefined {
  if (typeof window === 'undefined') return undefined

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift()
  }
  return undefined
}
