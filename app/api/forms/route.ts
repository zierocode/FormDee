import { NextRequest, NextResponse } from 'next/server'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'

const ADMIN_API_KEY = process.env.ADMIN_API_KEY
const ADMIN_UI_KEY = process.env.ADMIN_UI_KEY

function errorResponse(message: string, code: number = HTTP_STATUS.BAD_REQUEST) {
  return NextResponse.json(
    { ok: false, error: { code: String(code), message } },
    { status: code as any }
  )
}

function validateAdminKey(req: NextRequest): boolean {
  const clientKey = 
    req.headers.get('x-admin-key') || 
    req.cookies.get('adminKey')?.value || 
    new URL(req.url).searchParams.get('adminKey')
  
  const validKeys = [ADMIN_UI_KEY, ADMIN_API_KEY].filter(Boolean)
  return validKeys.length > 0 && !!clientKey && validKeys.includes(clientKey)
}

async function callGAS(path: string, options?: RequestInit): Promise<any> {
  const baseUrl = process.env.GAS_BASE_URL
  if (!baseUrl) {
    throw new Error('GAS_BASE_URL not configured')
  }
  
  const url = `${baseUrl}${path}`
  console.log('[GAS] Calling:', url)
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    redirect: 'follow',
    ...options
  })
  
  console.log('[GAS] Response status:', response.status, 'URL:', response.url)
  
  if (!response.ok) {
    const text = await response.text()
    console.log('[GAS] Error response:', text.slice(0, 200))
    throw new Error(`GAS returned status ${response.status}`)
  }
  
  const text = await response.text()
  console.log('[GAS] Response text:', text.slice(0, 200))
  
  try {
    return JSON.parse(text)
  } catch (error) {
    console.error('[GAS] Failed to parse JSON:', text.slice(0, 200))
    throw new Error('Invalid JSON response from GAS')
  }
}

async function handleGet(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const refKey = searchParams.get('refKey')
  const op = searchParams.get('op')

  console.log('[FORMS API] GET request:', { refKey, op, url: req.url })

  try {
    // Public endpoint for single form
    if (refKey) {
      console.log('[FORMS API] Fetching single form:', refKey)
      const response = await callGAS(`?op=forms&refKey=${encodeURIComponent(refKey)}`)
      
      // Handle GAS response structure {ok: true, data: {...}}
      if (response?.ok && response?.data) {
        // Check if it's an array (shouldn't be for single form, but handle it)
        if (Array.isArray(response.data)) {
          const form = response.data.find((f: any) => f.refKey === refKey)
          if (form) {
            return NextResponse.json({ ok: true, data: form })
          } else {
            return errorResponse(ERROR_MESSAGES.FORM_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
          }
        }
        
        // Single form response - the expected case
        if (response.data && typeof response.data === 'object' && response.data.refKey) {
          return NextResponse.json({ ok: true, data: response.data })
        }
      }
      
      // Handle error response from GAS
      if (response?.ok === false) {
        return errorResponse(
          response.error?.message || ERROR_MESSAGES.FORM_NOT_FOUND,
          parseInt(response.error?.code) || HTTP_STATUS.NOT_FOUND
        )
      }
      
      return errorResponse(ERROR_MESSAGES.FORM_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // Admin endpoints
    if (!validateAdminKey(req)) {
      return errorResponse(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    // Handle sheets metadata operation
    if (op === 'sheets_meta') {
      const id = searchParams.get('id')
      if (!id) {
        return errorResponse('Missing spreadsheet ID', HTTP_STATUS.BAD_REQUEST)
      }
      
      const apiKey = process.env.ADMIN_API_KEY || ''
      const data = await callGAS(`?op=sheets_meta&id=${encodeURIComponent(id)}&apiKey=${encodeURIComponent(apiKey)}`)
      return NextResponse.json(data)
    }

    // Handle data count check operation
    if (op === 'data_count') {
      const refKey = searchParams.get('refKey')
      const responseSheetUrl = searchParams.get('responseSheetUrl')
      if (!refKey || !responseSheetUrl) {
        return errorResponse('Missing refKey or responseSheetUrl', HTTP_STATUS.BAD_REQUEST)
      }
      
      const apiKey = process.env.ADMIN_API_KEY || ''
      const data = await callGAS(`?op=data_count&refKey=${encodeURIComponent(refKey)}&responseSheetUrl=${encodeURIComponent(responseSheetUrl)}&apiKey=${encodeURIComponent(apiKey)}`)
      return NextResponse.json(data)
    }

    // Get all forms (admin only)
    const apiKey = process.env.ADMIN_API_KEY || ''
    const data = await callGAS(`?op=forms&apiKey=${encodeURIComponent(apiKey)}`)
    
    // Ensure consistent response format
    if (Array.isArray(data)) {
      return NextResponse.json({ ok: true, data })
    } else if (data?.data) {
      return NextResponse.json({ ok: true, data: data.data })
    } else {
      return NextResponse.json({ ok: true, data: [] })
    }

  } catch (error: any) {
    console.error('[API] Forms GET error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.GENERIC,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

async function handlePost(req: NextRequest) {
  try {
    // Validate admin key
    if (!validateAdminKey(req)) {
      return errorResponse(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const body = await req.json()
    
    // Handle test slack operation
    const { searchParams } = new URL(req.url)
    const op = searchParams.get('op')
    
    if (op === 'test_slack') {
      const apiKey = process.env.ADMIN_API_KEY || ''
      const result = await callGAS(`?op=forms_test_slack&apiKey=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        body: JSON.stringify(body)
      })
      return NextResponse.json(result)
    }

    // Save form configuration
    const apiKey = process.env.ADMIN_API_KEY || ''
    
    // Check the type of operation needed
    let gasOp = 'forms'
    if (body._migrate === true) {
      gasOp = 'forms_migrate'
    } else if (body._updateHeadersOnly === true) {
      gasOp = 'forms_update_headers'
    }
    
    const result = await callGAS(`?op=${gasOp}&apiKey=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    
    // Handle the GAS response structure properly
    if (result?.ok === false) {
      return errorResponse(
        result.error?.message || ERROR_MESSAGES.GENERIC,
        parseInt(result.error?.code) || HTTP_STATUS.BAD_REQUEST
      )
    }
    
    // Return the form data from the result
    const formData = result?.data || result
    return NextResponse.json({ ok: true, data: formData })

  } catch (error: any) {
    console.error('[API] Forms POST error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.GENERIC,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

async function handleDelete(req: NextRequest) {
  try {
    // Validate admin key
    if (!validateAdminKey(req)) {
      return errorResponse(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const { searchParams } = new URL(req.url)
    const refKey = searchParams.get('refKey')
    
    if (!refKey) {
      return errorResponse('Missing refKey parameter', HTTP_STATUS.BAD_REQUEST)
    }

    // Call GAS to delete the form
    const apiKey = process.env.ADMIN_API_KEY || ''
    const result = await callGAS(`?op=forms_delete&refKey=${encodeURIComponent(refKey)}&apiKey=${encodeURIComponent(apiKey)}`, {
      method: 'POST'  // GAS web app uses POST for all operations
    })
    
    // Handle the GAS response structure properly
    if (result?.ok === false) {
      return errorResponse(
        result.error?.message || ERROR_MESSAGES.GENERIC,
        parseInt(result.error?.code) || HTTP_STATUS.BAD_REQUEST
      )
    }
    
    return NextResponse.json({ ok: true, message: `Form ${refKey} deleted successfully` })

  } catch (error: any) {
    console.error('[API] Forms DELETE error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.GENERIC,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

// Simple exports without caching middleware
export const GET = handleGet
export const POST = handlePost
export const DELETE = handleDelete

// Add OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
      'Access-Control-Max-Age': '86400',
    },
  })
}