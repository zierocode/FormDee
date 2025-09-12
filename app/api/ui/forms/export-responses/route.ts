import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { getGoogleAuthFromDatabase } from '@/lib/google-auth'
import { exportResponsesToGoogleSheets } from '@/lib/google-sheets-user'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

/**
 * UI-only endpoint for exporting responses to Google Sheets
 *
 * IMPORTANT: This endpoint is ONLY for UI/browser access
 * - Uses UI authentication (cookie-based)
 * - DO NOT modify to accept API keys
 * - For API access, use /api/forms/export-responses instead
 *
 * Security: UI key only - never accept API keys here
 */

async function handlePost(req: NextRequest) {
  try {
    // Validate UI authentication
    const auth = await withApiAuth(req, 'ui')

    if (!auth.authenticated) {
      return NextResponse.json(
        { ok: false, error: auth.error || ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    const body = await req.json()
    const { refKey, googleSheetUrl, fields } = body

    if (!refKey) {
      return NextResponse.json(
        { ok: false, error: 'Form refKey is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    if (!googleSheetUrl) {
      return NextResponse.json(
        { ok: false, error: 'Google Sheet URL is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    if (!fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { ok: false, error: 'Form fields are required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Get Google session for this specific form
    const googleSession = await getGoogleAuthFromDatabase(refKey)

    if (!googleSession || !googleSession.accessToken) {
      logger.error('[UI API] No Google auth found for form', { refKey })

      return NextResponse.json(
        {
          ok: false,
          error: 'Google authentication required',
          details: {
            suggestion: 'Please authenticate with Google first to export responses',
            needsAuth: true,
          },
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    logger.info('[UI API] Exporting responses to Google Sheets', {
      refKey,
      url: googleSheetUrl,
    })

    // Get all responses from Supabase
    const { data: responses, error: responsesError } = await supabase
      .from('Responses')
      .select('*')
      .eq('refKey', refKey)
      .order('submittedAt', { ascending: true })

    if (responsesError) {
      logger.error('[UI API] Error fetching responses:', responsesError)
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch responses' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      )
    }

    // Prepare headers (column names)
    const headers = ['Timestamp', ...fields.map((field: any) => field.label || field.key)]

    // Transform responses into rows
    const responseData =
      responses?.map((response) => {
        const formData = response.formData || {}
        return [
          response.submittedAt || new Date().toISOString(),
          ...fields.map((field: any) => {
            const value = formData[field.key] || ''
            // Convert arrays/objects to string for sheets
            return typeof value === 'object' ? JSON.stringify(value) : String(value)
          }),
        ]
      }) || []

    // Export to Google Sheets
    const exportResult = await exportResponsesToGoogleSheets(
      googleSheetUrl,
      headers,
      responseData,
      {
        accessToken: googleSession.accessToken,
        refreshToken: googleSession.refreshToken,
      }
    )

    if (!exportResult.success) {
      logger.error('[UI API] Export failed:', exportResult.error)
      return NextResponse.json(
        {
          ok: false,
          error: exportResult.error || 'Failed to export responses to Google Sheets',
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // If a new spreadsheet was created, update the form
    if (exportResult.newSpreadsheetUrl) {
      const { error: updateError } = await supabase
        .from('Forms')
        .update({ googleSheetUrl: exportResult.newSpreadsheetUrl })
        .eq('refKey', refKey)

      if (updateError) {
        logger.error('[UI API] Failed to update form with new Google Sheet URL:', updateError)
      }

      return NextResponse.json({
        ok: true,
        message: `Created new spreadsheet and exported ${exportResult.rowsAppended || 0} responses`,
        newSpreadsheetUrl: exportResult.newSpreadsheetUrl,
        details: {
          responsesExported: exportResult.rowsAppended || 0,
          spreadsheetTitle: exportResult.spreadsheetTitle || 'FormDee Responses',
          newSpreadsheetCreated: true,
        },
      })
    }

    // Success
    return NextResponse.json({
      ok: true,
      message: `Successfully exported ${exportResult.rowsAppended || 0} responses to Google Sheets`,
      details: {
        responsesExported: exportResult.rowsAppended || 0,
        spreadsheetTitle: exportResult.spreadsheetTitle,
        sheetName: exportResult.sheetName || 'FormDee Responses',
      },
    })
  } catch (error: any) {
    logger.error('[UI API] Export responses error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || ERROR_MESSAGES.GENERIC,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    )
  }
}

export const POST = handlePost
