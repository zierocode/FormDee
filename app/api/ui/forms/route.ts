import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { logger } from '@/lib/logger'
import { deleteFromR2, extractKeyFromUrl } from '@/lib/r2-storage'
import { supabase, FormRecord } from '@/lib/supabase'

/**
 * UI-only endpoint for form management
 *
 * IMPORTANT: This endpoint is ONLY for UI/browser access
 * - Uses UI authentication (cookie-based)
 * - DO NOT modify to accept API keys
 * - For API access, use /api/forms instead
 *
 * Security: UI key only - never accept API keys here
 */

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
    // Public endpoint for single form (no auth needed)
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
          logger.error('Failed to parse fields JSON', e)
        }
      }

      return NextResponse.json({ ok: true, data })
    }

    // List all forms - requires UI authentication
    const auth = await withApiAuth(req, 'ui')

    if (!auth.authenticated) {
      return errorResponse(auth.error || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    // Get all forms from Supabase
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
          logger.error(`Failed to parse fields JSON for form: ${form.refKey}`, e)
        }
      }
      return form
    })

    return NextResponse.json({ ok: true, data: forms })
  } catch (error: any) {
    logger.error('[UI API] Forms GET error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.GENERIC,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

async function handlePost(req: NextRequest) {
  try {
    // Validate UI authentication
    const auth = await withApiAuth(req, 'ui')

    if (!auth.authenticated) {
      return errorResponse(auth.error || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const body = await req.json()
    logger.info('[UI API] Form save request:', {
      refKey: body.refKey,
      googleSheetEnabled: body.googleSheetEnabled,
      googleSheetUrl: body.googleSheetUrl ? '[URL_PROVIDED]' : null,
    })

    // Check if form exists and get its google_auth_id
    const { data: existingForm } = await supabase
      .from('Forms')
      .select('id, google_auth_id')
      .eq('refKey', body.refKey)
      .single()

    // Preserve existing google_auth_id or get the most recent one if Google Sheets is enabled
    let googleAuthId = existingForm?.google_auth_id || null

    // If Google Sheets is enabled and we don't have a google_auth_id yet,
    // try to get the most recent GoogleAuth record
    if (body.googleSheetEnabled && body.googleSheetUrl && !googleAuthId) {
      // Get the most recently created/updated GoogleAuth record
      const { data: recentAuth } = await supabase
        .from('GoogleAuth')
        .select('id')
        .order('last_used_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .single()

      if (recentAuth) {
        googleAuthId = recentAuth.id
        logger.info('[UI API] Linking recent GoogleAuth to form:', {
          refKey: body.refKey,
          googleAuthId: recentAuth.id,
        })
      }
    }

    // Prepare form data
    const formData: FormRecord = {
      refKey: body.refKey,
      title: body.title,
      description: body.description,
      slackWebhookUrl: body.slackWebhookUrl,
      slackEnabled: body.slackEnabled || false,
      googleSheetUrl: body.googleSheetUrl || body.responseSheetUrl,
      googleSheetEnabled: body.googleSheetEnabled || false,
      google_auth_id: googleAuthId,
      fields: body.fields,
      updated_at: new Date().toISOString(),
    }

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
      const { data, error } = await supabase.from('Forms').insert([formData]).select().single()

      if (error) throw error
      result = data
    }

    logger.info('[UI API] Form saved successfully:', { refKey: body.refKey })
    return NextResponse.json({ ok: true, data: result })
  } catch (error: any) {
    logger.error('[UI API] Forms POST error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.GENERIC,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

async function handleDelete(req: NextRequest) {
  try {
    // Validate UI authentication
    const auth = await withApiAuth(req, 'ui')

    if (!auth.authenticated) {
      return errorResponse(auth.error || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const { searchParams } = new URL(req.url)
    const refKey = searchParams.get('refKey')

    if (!refKey) {
      return errorResponse('Reference key is required', HTTP_STATUS.BAD_REQUEST)
    }

    // Get form data including responses with files
    const { data: formData, error: formError } = await supabase
      .from('Forms')
      .select('*')
      .eq('refKey', refKey)
      .single()

    if (formError || !formData) {
      return errorResponse(ERROR_MESSAGES.FORM_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // Get all responses with file information
    const { data: responses, error: responsesError } = await supabase
      .from('Responses')
      .select('files')
      .eq('refKey', refKey)

    if (!responsesError && responses) {
      // Delete all files from R2
      for (const response of responses) {
        if (response.files && typeof response.files === 'object') {
          const files = response.files as Record<string, any>
          for (const fieldKey in files) {
            const fileData = files[fieldKey]
            if (fileData) {
              const urls = Array.isArray(fileData) ? fileData : [fileData]
              for (const url of urls) {
                if (url && typeof url === 'string') {
                  const key = extractKeyFromUrl(url)
                  if (key) {
                    await deleteFromR2(key)
                    logger.info(`[UI API] Deleted file from R2: ${key}`)
                  }
                }
              }
            }
          }
        }
      }
    }

    // Delete all responses
    const { error: deleteResponsesError } = await supabase
      .from('Responses')
      .delete()
      .eq('refKey', refKey)

    if (deleteResponsesError) {
      logger.error('[UI API] Error deleting responses:', deleteResponsesError)
    }

    // Delete the form
    const { error: deleteFormError } = await supabase.from('Forms').delete().eq('refKey', refKey)

    if (deleteFormError) {
      throw deleteFormError
    }

    logger.info('[UI API] Form and associated data deleted successfully:', { refKey })
    return NextResponse.json({ ok: true, message: 'Form deleted successfully' })
  } catch (error: any) {
    logger.error('[UI API] Forms DELETE error:', error)
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

export async function DELETE(req: NextRequest) {
  return handleDelete(req)
}
