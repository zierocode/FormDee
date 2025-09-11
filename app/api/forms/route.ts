import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { logger } from '@/lib/logger'
import { deleteFromR2, extractKeyFromUrl } from '@/lib/r2-storage'
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
          logger.error('Failed to parse fields JSON', e)
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
          logger.error(`Failed to parse fields JSON for form: ${form.refKey}`, e)
        }
      }
      return form
    })

    return NextResponse.json({ ok: true, data: forms })
  } catch (error: any) {
    logger.error('[API] Forms GET error:', error)
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
    logger.info('[API] Form save request:', {
      refKey: body.refKey,
      googleSheetEnabled: body.googleSheetEnabled,
      googleSheetUrl: body.googleSheetUrl ? '[URL_PROVIDED]' : null,
    })

    // If Google Sheets is enabled, get the associated Google auth ID
    let googleAuthId = null
    if (body.googleSheetEnabled && body.googleSheetUrl) {
      // Check if there's a recent Google auth in the database
      const { data: recentAuth } = await supabase
        .from('GoogleAuth')
        .select('id')
        .order('last_used_at', { ascending: false })
        .limit(1)
        .single()

      googleAuthId = recentAuth?.id || null
    }

    // Prepare data for Supabase
    const formData: Partial<FormRecord> = {
      refKey: body.refKey,
      title: body.title,
      description: body.description || null,
      slackWebhookUrl: body.slackWebhookUrl || null,
      slackEnabled: body.slackEnabled || false,
      googleSheetUrl: body.googleSheetUrl || null,
      googleSheetEnabled: body.googleSheetEnabled || false,
      google_auth_id: googleAuthId,
      fields: body.fields || [],
      updated_at: new Date().toISOString(),
    } as any

    // Check if form exists
    const { data: existingForm } = await supabase
      .from('Forms')
      .select('id, google_auth_id')
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
        logger.error('Failed to parse fields JSON', e)
      }
    }

    return NextResponse.json({ ok: true, data: result })
  } catch (error: any) {
    logger.error('[API] Forms POST error:', error)
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

    logger.info(`[API] Starting deletion process for form: ${refKey}`)

    // Step 1: Get all responses to find uploaded files
    const { data: responses, error: responseError } = await supabase
      .from('Responses')
      .select('id, formData, files')
      .eq('refKey', refKey)

    if (responseError) {
      logger.error('[API] Error fetching responses:', responseError)
      // Continue with deletion even if we can't fetch responses
    }

    logger.info(`[API] Found ${responses?.length || 0} responses for form ${refKey}`)

    // Step 2: Delete all files from R2 storage
    let filesDeleted = 0
    let fileDeleteErrors = 0

    if (responses && responses.length > 0) {
      for (const response of responses) {
        try {
          // Check files field (newer format)
          if (response.files && typeof response.files === 'object') {
            const fileUrls = Object.values(response.files).flat()
            for (const fileUrl of fileUrls) {
              if (typeof fileUrl === 'string') {
                const fileKey = extractKeyFromUrl(fileUrl)
                if (fileKey) {
                  const deleted = await deleteFromR2(fileKey)
                  if (deleted) {
                    filesDeleted++
                    logger.info(`[API] Deleted file: ${fileKey}`)
                  } else {
                    fileDeleteErrors++
                    logger.warn(`[API] Failed to delete file: ${fileKey}`)
                  }
                }
              }
            }
          }

          // Check formData for file URLs (older format)
          if (response.formData && typeof response.formData === 'object') {
            for (const [_key, value] of Object.entries(response.formData)) {
              if (typeof value === 'string' && value.includes(process.env.R2_PUBLIC_URL || '')) {
                const fileKey = extractKeyFromUrl(value)
                if (fileKey) {
                  const deleted = await deleteFromR2(fileKey)
                  if (deleted) {
                    filesDeleted++
                    logger.info(`[API] Deleted file from formData: ${fileKey}`)
                  } else {
                    fileDeleteErrors++
                    logger.warn(`[API] Failed to delete file from formData: ${fileKey}`)
                  }
                }
              }
            }
          }
        } catch (fileError) {
          logger.error(`[API] Error processing files for response ${response.id}:`, fileError)
          fileDeleteErrors++
        }
      }
    }

    logger.info(`[API] File deletion summary: ${filesDeleted} deleted, ${fileDeleteErrors} errors`)

    // Step 3: Delete all responses
    let responsesDeleted = 0
    if (responses && responses.length > 0) {
      const { error: deleteResponsesError, count } = await supabase
        .from('Responses')
        .delete()
        .eq('refKey', refKey)

      if (deleteResponsesError) {
        logger.error('[API] Error deleting responses:', deleteResponsesError)
        throw new Error(`Failed to delete responses: ${deleteResponsesError.message}`)
      }

      responsesDeleted = count || responses.length
      logger.info(`[API] Deleted ${responsesDeleted} responses`)
    }

    // Step 4: Delete the form itself
    const { error: deleteFormError } = await supabase.from('Forms').delete().eq('refKey', refKey)

    if (deleteFormError) {
      logger.error('[API] Error deleting form:', deleteFormError)
      throw new Error(`Failed to delete form: ${deleteFormError.message}`)
    }

    logger.info(`[API] Successfully deleted form: ${refKey}`)

    // Return success with summary
    return NextResponse.json({
      ok: true,
      message: `Form "${refKey}" deleted successfully`,
      summary: {
        form: 1,
        responses: responsesDeleted,
        files: filesDeleted,
        fileErrors: fileDeleteErrors,
      },
    })
  } catch (error: any) {
    logger.error('[API] Forms DELETE error:', error)
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
