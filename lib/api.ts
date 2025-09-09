import { getCookie } from './auth'
import { ApiResult, FormConfig } from './types'

export type FormsList = Pick<FormConfig, 'refKey' | 'title' | 'description'>[]

export async function fetchFormPublic(
  refKey: string,
  init: RequestInit = {}
): Promise<ApiResult<FormConfig>> {
  const res = await fetch(`/api/forms?refKey=${encodeURIComponent(refKey)}`, init)
  return res.json()
}

export async function submitForm(data: {
  refKey: string
  values: Record<string, unknown>
}): Promise<ApiResult<{ id: string }>> {
  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function checkExistingDataCount(
  refKey: string,
  responseSheetUrl: string,
  adminKey?: string
): Promise<ApiResult<{ count: number }>> {
  return adminFetch<{ count: number }>(
    `/api/forms?op=data_count&refKey=${encodeURIComponent(refKey)}&responseSheetUrl=${encodeURIComponent(responseSheetUrl)}`,
    { adminKey }
  )
}

export async function adminFetch<T>(
  path: string,
  init: RequestInit & { adminKey?: string } = {}
): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers)
  const key = init.adminKey
  let effectiveKey = key
  if (!effectiveKey && typeof window !== 'undefined') {
    // Don't use localStorage for keys anymore - rely on cookies for UI access
    effectiveKey = getCookie('admin_key') || undefined
  }
  // Don't send UI keys as headers or query params - they should use cookies
  // Only send explicitly provided API keys in headers
  if (effectiveKey && init.adminKey) {
    headers.set('x-api-key', effectiveKey)
  }
  let url = path
  try {
    if (effectiveKey && init.adminKey && path.startsWith('/api/')) {
      const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      const u = new URL(path, base)
      // Only add query param for explicitly provided API keys, not UI keys from cookies
      if (!u.searchParams.has('adminKey')) u.searchParams.set('adminKey', effectiveKey)
      url = u.pathname + (u.search ? u.search : '')
    }
  } catch {}
  const res = await fetch(url, { ...init, headers })
  try {
    return await res.json()
  } catch (e: any) {
    return {
      ok: false,
      error: { code: String(res.status || 500), message: 'Server returned non-JSON response.' },
    } as any
  }
}
