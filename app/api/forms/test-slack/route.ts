import { NextRequest, NextResponse } from 'next/server'
import { getEnvBase, getGasBase, joinPath, learnFromResponse } from '@/lib/server/gas'

const ADMIN_API_KEY = process.env.ADMIN_API_KEY
const ADMIN_UI_KEY = process.env.ADMIN_UI_KEY

function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: { code: String(code), message: msg } }, { status: code })
}

function gasUrl(path: string, preferEnv = false) {
  const base = preferEnv ? getEnvBase() : getGasBase()
  return joinPath(base, path)
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const clientKey = req.headers.get('x-admin-key') || req.cookies.get('admin_key')?.value || url.searchParams.get('adminKey')
  const validKeys = [ADMIN_UI_KEY, ADMIN_API_KEY].filter(Boolean)
  if (validKeys.length === 0 || !clientKey || !validKeys.includes(clientKey)) return bad('Unauthorized: invalid admin key', 401)
  try {
    const body = await req.json().catch(() => ({}))
    const apiKeyForGas = (ADMIN_API_KEY && ADMIN_API_KEY.length > 0) ? ADMIN_API_KEY : clientKey || ''
    // For POST use the original /exec base, not googleusercontent echo.
    const res = await fetch(gasUrl(`?op=forms_test_slack&apiKey=${encodeURIComponent(apiKeyForGas)}`, true), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': ADMIN_API_KEY || '' },
      body: JSON.stringify(body),
    })
    learnFromResponse(res)
    const ct = res.headers.get('content-type') || ''
    // Prefer JSON, but tolerate text responses from GAS to avoid false 502s
    if (ct.includes('application/json')) {
      const json = await res.json()
      return NextResponse.json(json, { status: res.status })
    } else {
      const text = await res.text()
      if (res.ok) {
        return NextResponse.json({ ok: true, data: { ok: true } }, { status: 200 })
      }
      return NextResponse.json({ ok: false, error: { code: String(res.status || 502), message: text.slice(0, 200) || 'Upstream error' } }, { status: res.status || 502 })
    }
  } catch (e: any) {
    return bad(e?.message || 'Proxy error', 500)
  }
}
