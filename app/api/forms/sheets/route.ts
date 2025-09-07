import { NextRequest, NextResponse } from 'next/server'
import { getEnvBase, joinPath } from '@/lib/server/gas'

const ADMIN_API_KEY = process.env.ADMIN_API_KEY
const ADMIN_UI_KEY = process.env.ADMIN_UI_KEY

function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: { code: String(code), message: msg } }, { status: code })
}

function gasUrl(path: string) {
  // For sheets_meta operations, always use the original base URL to avoid caching issues
  const base = getEnvBase()
  return joinPath(base, path)
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id') || url.searchParams.get('url')
  if (!id) return bad('Missing id', 400)
  const clientKey = req.headers.get('x-admin-key') || req.cookies.get('adminKey')?.value || url.searchParams.get('adminKey')
  const validKeys = [ADMIN_UI_KEY, ADMIN_API_KEY].filter(Boolean)
  if (validKeys.length === 0 || !clientKey || !validKeys.includes(clientKey)) return bad('Unauthorized: invalid admin key', 401)
  try {
    const apiKeyForGas = (ADMIN_API_KEY && ADMIN_API_KEY.length > 0) ? ADMIN_API_KEY : clientKey || ''
    const gasApiUrl = gasUrl(`?op=sheets_meta&id=${encodeURIComponent(id)}&apiKey=${encodeURIComponent(apiKeyForGas)}`)
    
    console.log('Making request to GAS API:', gasApiUrl.replace(/apiKey=[^&]+/, 'apiKey=[REDACTED]'))
    
    const upstream = await fetch(gasApiUrl, {
      cache: 'no-store',
      headers: { 'X-API-Key': ADMIN_API_KEY || '' }
    })
    
    console.log('GAS API response status:', upstream.status)
    console.log('GAS API response headers:', Object.fromEntries(upstream.headers.entries()))
    
    // Don't learn from sheets_meta responses to avoid URL caching issues
    const ct = upstream.headers.get('content-type') || ''
    
    if (ct.includes('application/json')) {
      const json = await upstream.json()
      console.log('GAS API JSON response:', json)
      return NextResponse.json(json, { status: upstream.status })
    }
    
    const text = await upstream.text()
    console.error('GAS API returned non-JSON response:', text)
    return NextResponse.json({ 
      ok: false, 
      error: { 
        code: '502', 
        message: `Apps Script returned non-JSON response. This usually indicates:\n• Apps Script deployment issue\n• Authentication problem\n• Script execution error\n\nResponse: ${text.slice(0, 200)}${text.length > 200 ? '...' : ''}` 
      } 
    }, { status: 502 })
  } catch (e: any) {
    console.error('Sheets API proxy error:', e)
    return bad(`Proxy error: ${e?.message || 'Unknown error'}. Check server logs for details.`, 500)
  }
}

