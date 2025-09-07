import { NextRequest, NextResponse } from 'next/server'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'

function errorResponse(message: string, code: number = HTTP_STATUS.BAD_REQUEST) {
  return NextResponse.json(
    { ok: false, error: { code: String(code), message } },
    { status: code as any }
  )
}

async function callGAS(path: string, options?: RequestInit): Promise<any> {
  const baseUrl = process.env.GAS_BASE_URL
  if (!baseUrl) {
    throw new Error('GAS_BASE_URL not configured')
  }
  
  const url = `${baseUrl}${path}`
  console.log('[GAS] Calling:', url)
  
  const response = await fetch(url, {
    method: 'POST',
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

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Get IP and User-Agent
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               req.ip || 
               'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    
    // Add metadata to submission
    const submissionData = {
      ...body,
      ip,
      userAgent
    }
    
    console.log('[SUBMIT API] POST request:', { 
      body: submissionData,
      refKey: submissionData.refKey,
      values: submissionData.values
    })
    
    // Submit form data to GAS
    const result = await callGAS('?op=submit', {
      method: 'POST',
      body: JSON.stringify(submissionData)
    })
    
    console.log('[SUBMIT API] GAS result:', result)
    
    // Handle response
    if (result?.ok === false) {
      return errorResponse(
        result.error?.message || ERROR_MESSAGES.SUBMISSION_FAILED,
        parseInt(result.error?.code) || HTTP_STATUS.BAD_REQUEST
      )
    }
    
    // Return success response
    return NextResponse.json(result?.ok ? result : { ok: true, data: result })
    
  } catch (error: any) {
    console.error('[API] Submit error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.SUBMISSION_FAILED,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

// Simple exports without middleware
export const POST = handlePost

// Add OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}