import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'

/**
 * UI-only endpoint for settings management
 *
 * IMPORTANT: This endpoint is ONLY for UI/browser access
 * - Uses UI authentication (cookie-based)
 * - DO NOT modify to accept API keys
 * - For API access, use /api/settings instead
 *
 * Security: UI key only - never accept API keys here
 */

function errorResponse(message: string, code: number = HTTP_STATUS.BAD_REQUEST) {
  return NextResponse.json(
    { ok: false, error: { code: String(code), message } },
    { status: code as any }
  )
}

/**
 * GET /api/ui/settings - Get current settings
 * Returns the AI model and API key configuration
 */
async function handleGet(req: NextRequest) {
  try {
    // Validate UI authentication
    const auth = await withApiAuth(req, 'ui')
    if (!auth.authenticated) {
      return errorResponse(auth.error || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    // Get settings from database
    const { data, error } = await supabase.from('Settings').select('*').single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is ok for first time
      throw new Error(error.message)
    }

    // Return settings or defaults
    return NextResponse.json({
      ok: true,
      aiModel: data?.ai_model || 'gpt-4o-mini',
      apiKey: data?.api_key || '',
    })
  } catch (error: any) {
    console.error('[UI API] Settings GET error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.GENERIC,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

/**
 * POST /api/ui/settings - Update settings
 * Body: { aiModel: string, apiKey: string }
 */
async function handlePost(req: NextRequest) {
  try {
    // Validate UI authentication
    const auth = await withApiAuth(req, 'ui')
    if (!auth.authenticated) {
      return errorResponse(auth.error || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const body = await req.json()
    const { aiModel, apiKey } = body

    if (!aiModel || !apiKey) {
      return errorResponse('AI model and API key are required', HTTP_STATUS.BAD_REQUEST)
    }

    // Check if settings exist
    const { data: existing } = await supabase.from('Settings').select('id').single()

    // let _result
    if (existing) {
      // Update existing settings
      const { data: _data, error } = await supabase
        .from('Settings')
        .update({
          ai_model: aiModel,
          api_key: apiKey,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      // _result = data
    } else {
      // Create new settings
      const { data: _data, error } = await supabase
        .from('Settings')
        .insert([
          {
            ai_model: aiModel,
            api_key: apiKey,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) throw error
      // _result = data
    }

    return NextResponse.json({
      ok: true,
      message: 'Settings updated successfully',
    })
  } catch (error: any) {
    console.error('[UI API] Settings POST error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.GENERIC,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

export async function GET(req: NextRequest) {
  return handleGet(req)
}

export async function POST(req: NextRequest) {
  return handlePost(req)
}
