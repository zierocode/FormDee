import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { getGoogleSessionFromCookies } from '@/lib/google-auth'
import { exportResponsesToGoogleSheets } from '@/lib/google-sheets-user'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

async function handlePost(req: NextRequest) {
  try {
    // Validate authentication
    const auth = await withApiAuth(req, 'any')

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

    // Get Google session from cookies
    const googleSession = getGoogleSessionFromCookies(req)

    if (!googleSession || !googleSession.accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Google authentication required',
          details: {
            suggestion: 'Please authenticate with Google first',
            needsAuth: true,
          },
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    // Get existing responses from Supabase
    const { data: responses, error: responsesError } = await supabase
      .from('Responses')
      .select('*')
      .eq('refKey', refKey)
      .order('submittedAt', { ascending: true })

    if (responsesError) {
      logger.error('Error fetching responses:', responsesError)
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch existing responses' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      )
    }

    // Prepare headers for Google Sheets
    const headers = ['Timestamp', ...fields.map((field: any) => field.label || field.key)]

    // Prepare response data for Google Sheets
    const responseData =
      responses?.map((response) => {
        const formData = response.formData || {}
        return [
          response.submittedAt || new Date().toISOString(),
          ...fields.map((field: any) => {
            const value = formData[field.key] || ''
            return typeof value === 'object' ? JSON.stringify(value) : String(value)
          }),
        ]
      }) || []

    logger.info(`[Export] Exporting ${responseData.length} existing responses for form: ${refKey}`)

    // Export to Google Sheets (will create sheet if it doesn't exist)
    const exportResult = await exportResponsesToGoogleSheets(
      googleSheetUrl,
      headers,
      responseData,
      {
        accessToken: googleSession.accessToken,
        refreshToken: googleSession.refreshToken,
      }
    )

    if (exportResult.success) {
      // If a new spreadsheet was created, update the form with the new URL
      if (exportResult.newSpreadsheetUrl) {
        logger.info(
          `[Export] New spreadsheet created, updating form with URL: ${exportResult.newSpreadsheetUrl}`
        )

        const { error: updateError } = await supabase
          .from('Forms')
          .update({ googleSheetUrl: exportResult.newSpreadsheetUrl })
          .eq('refKey', refKey)

        if (updateError) {
          logger.error('Failed to update form with new Google Sheet URL:', updateError)
        }

        return NextResponse.json({
          ok: true,
          message: `Created new Google Sheet and exported ${exportResult.rowsAppended || 0} responses`,
          newSpreadsheetUrl: exportResult.newSpreadsheetUrl,
          details: {
            status: 'New spreadsheet created and responses exported',
            responsesExported: exportResult.rowsAppended || 0,
            totalResponses: responseData.length,
            newSpreadsheet: true,
          },
        })
      }

      return NextResponse.json({
        ok: true,
        message: `Successfully exported ${exportResult.rowsAppended || 0} existing responses to Google Sheets`,
        details: {
          status: 'Export completed successfully',
          responsesExported: exportResult.rowsAppended || 0,
          totalResponses: responseData.length,
        },
      })
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: exportResult.error || 'Failed to export responses to Google Sheets',
          details: {
            suggestion: exportResult.error?.includes('authentication')
              ? 'Please re-authenticate with Google'
              : 'Make sure you have edit access to this Google Sheet',
          },
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
  } catch (error: any) {
    logger.error('[API] Export responses error:', error)
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
