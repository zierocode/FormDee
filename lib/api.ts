import { ApiResult, FormConfig } from './types'

const GAS_BASE_URL = process.env.GAS_BASE_URL as string | undefined

export function getBaseUrl() {
  if (!GAS_BASE_URL) throw new Error('GAS_BASE_URL env not set')
  return GAS_BASE_URL.replace(/\/$/, '')
}

export async function proxyFetch(path: string, init: RequestInit = {}) {
  const url = `${getBaseUrl()}${path}`
  return fetch(url, init)
}

export type FormsList = Pick<FormConfig, 'refKey' | 'title' | 'description'>[]

export async function fetchFormPublic(refKey: string, init: RequestInit = {}): Promise<ApiResult<FormConfig>> {
  const res = await fetch(`/api/forms?refKey=${encodeURIComponent(refKey)}`, init)
  return res.json()
}

export async function submitForm(data: { refKey: string; values: Record<string, unknown> }): Promise<ApiResult<{ id: string }>> {
  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function checkExistingDataCount(refKey: string, responseSheetUrl: string, adminKey?: string): Promise<ApiResult<{ count: number }>> {
  return adminFetch<{ count: number }>(`/api/forms?op=data_count&refKey=${encodeURIComponent(refKey)}&responseSheetUrl=${encodeURIComponent(responseSheetUrl)}`, { adminKey })
}

export async function adminFetch<T>(path: string, init: RequestInit & { adminKey?: string } = {}): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers)
  const key = init.adminKey
  let effectiveKey = key
  if (!effectiveKey && typeof window !== 'undefined') {
    effectiveKey = localStorage.getItem('adminKey') || getCookie('admin_key') || undefined
  }
  if (effectiveKey) headers.set('x-admin-key', effectiveKey)
  // Also include the key as a query param for endpoints where headers may not be visible upstream.
  // Safe because Next.js API will validate and never forward this to the browser.
  let url = path
  try {
    if (effectiveKey && path.startsWith('/api/')) {
      const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      const u = new URL(path, base)
      if (!u.searchParams.has('adminKey')) u.searchParams.set('adminKey', effectiveKey)
      url = u.pathname + (u.search ? u.search : '')
    }
  } catch {}
  const res = await fetch(url, { ...init, headers })
  try {
    return await res.json()
  } catch (e: any) {
    return { ok: false, error: { code: String(res.status || 500), message: 'Server returned non-JSON response.' } } as any
  }
}

function getCookie(name: string) {
  if (typeof document === 'undefined') return undefined
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : undefined
}
