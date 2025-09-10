import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { supabase, FormRecord } from '@/lib/supabase'

function errorResponse(message: string, code: number = HTTP_STATUS.BAD_REQUEST) {
  return NextResponse.json(
    { ok: false, error: { code: String(code), message } },
    { status: code as any }
  )
}

async function handleGet(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const refKey = searchParams.get('refKey')

  try {
    // Public endpoint for single form
    if (refKey) {
      const { data, error } = await supabase.from('Forms').select('*').eq('refKey', refKey).single()

      if (error || !data) {
        return errorResponse(ERROR_MESSAGES.FORM_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }

      // Convert fields from JSON string if needed
      if (typeof data.fields === 'string') {
        try {
          data.fields = JSON.parse(data.fields)
        } catch (e) {
          console.error('Failed to parse fields JSON:', e)
        }
      }

      return NextResponse.json({ ok: true, data })
    }

    // Admin endpoints - validate authentication
    const auth = await withApiAuth(req, 'any')

    if (!auth.authenticated) {
      return errorResponse(auth.error || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    // Get all forms (admin only) - from Supabase
    const { data, error } = await supabase
      .from('Forms')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    // Convert fields from JSON string if needed
    const forms = (data || []).map((form) => {
      if (typeof form.fields === 'string') {
        try {
          form.fields = JSON.parse(form.fields)
        } catch (e) {
          console.error('Failed to parse fields JSON for form:', form.refKey, e)
        }
      }
      return form
    })

    return NextResponse.json({ ok: true, data: forms })
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
    // Validate authentication - POST operations require API or UI key
    const auth = await withApiAuth(req, 'any')

    if (!auth.authenticated) {
      return errorResponse(auth.error || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const body = await req.json()

    // Prepare data for Supabase
    const formData: Partial<FormRecord> = {
      refKey: body.refKey,
      title: body.title,
      description: body.description || null,
      slackWebhookUrl: body.slackWebhookUrl || null,
      fields: body.fields || [],
      updated_at: new Date().toISOString(),
    }

    // Check if form exists
    const { data: existingForm } = await supabase
      .from('Forms')
      .select('id')
      .eq('refKey', body.refKey)
      .single()

    let result
    if (existingForm) {
      // Update existing form
      const { data, error } = await supabase
        .from('Forms')
        .update(formData)
        .eq('refKey', body.refKey)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new form
      const { data, error } = await supabase
        .from('Forms')
        .insert({
          ...formData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    // Convert fields from JSON string if needed
    if (typeof result.fields === 'string') {
      try {
        result.fields = JSON.parse(result.fields)
      } catch (e) {
        console.error('Failed to parse fields JSON:', e)
      }
    }

    return NextResponse.json({ ok: true, data: result })
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
    // Validate authentication - DELETE operations require API or UI key
    const auth = await withApiAuth(req, 'any')

    if (!auth.authenticated) {
      return errorResponse(auth.error || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const { searchParams } = new URL(req.url)
    const refKey = searchParams.get('refKey')

    if (!refKey) {
      return errorResponse('Missing refKey parameter', HTTP_STATUS.BAD_REQUEST)
    }

    // Delete from Supabase
    const { error } = await supabase.from('Forms').delete().eq('refKey', refKey)

    if (error) {
      throw new Error(error.message)
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
