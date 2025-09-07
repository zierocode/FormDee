import { NextRequest, NextResponse } from 'next/server'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'

const ADMIN_API_KEY = process.env.ADMIN_API_KEY
const ADMIN_UI_KEY = process.env.ADMIN_UI_KEY
const GAS_BASE_URL = process.env.GAS_BASE_URL

function errorResponse(message: string, code: number = HTTP_STATUS.BAD_REQUEST) {
  return NextResponse.json(
    { ok: false, error: { code: String(code), message } },
    { status: code as any }
  )
}

function validateAdminKey(req: NextRequest): boolean {
  const clientKey = 
    req.headers.get('x-admin-key') || 
    req.cookies.get('admin_key')?.value || 
    new URL(req.url).searchParams.get('adminKey')
  
  const validKeys = [ADMIN_UI_KEY, ADMIN_API_KEY].filter(Boolean)
  return validKeys.some(key => key === clientKey)
}

async function callGAS(queryString: string, options: RequestInit = {}) {
  const url = `${GAS_BASE_URL}${queryString}`
  const response = await fetch(url, {
    method: 'GET',
    ...options
  })

  if (!response.ok) {
    throw new Error(`GAS request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

async function handleDelete(req: NextRequest) {
  try {
    // Validate admin key
    if (!validateAdminKey(req)) {
      return errorResponse(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const { searchParams } = new URL(req.url)
    const sheetUrl = searchParams.get('sheetUrl')
    const refKey = searchParams.get('refKey')
    
    if (!sheetUrl) {
      return errorResponse('Missing sheetUrl parameter', HTTP_STATUS.BAD_REQUEST)
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      op: 'responses_delete',
      sheetUrl: sheetUrl,
      apiKey: ADMIN_API_KEY || ''
    })
    
    if (refKey) {
      queryParams.append('refKey', refKey)
    }

    // Call GAS to delete responses
    const result = await callGAS(`?${queryParams.toString()}`, {
      method: 'POST'  // GAS web app uses POST for all operations
    })
    
    // Handle the GAS response structure properly
    if (result?.ok === false) {
      return errorResponse(
        result.error?.message || ERROR_MESSAGES.GENERIC,
        parseInt(result.error?.code) || HTTP_STATUS.BAD_REQUEST
      )
    }
    
    return NextResponse.json({ 
      ok: true, 
      message: result.message || 'Responses deleted successfully',
      deletedCount: result.deletedCount || 0,
      sheetName: result.sheetName || 'Unknown'
    })

  } catch (error: any) {
    console.error('[API] Responses DELETE error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.GENERIC,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

// Simple exports without caching middleware
export const DELETE = handleDelete

// Add OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
      'Access-Control-Max-Age': '86400',
    },
  })
}