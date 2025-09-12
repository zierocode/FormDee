import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { getGoogleAuthFromDatabase } from '@/lib/google-auth'
import { testWriteGoogleSheet, exportResponsesToGoogleSheets } from '@/lib/google-sheets-user'
import { logger } from '@/lib/logger'

/**
 * UI-only endpoint for testing Google Sheets connection
 *
 * IMPORTANT: This endpoint is ONLY for UI/browser access
 * - Uses UI authentication (cookie-based)
 * - DO NOT modify to accept API keys
 * - For API access, use /api/forms/test-google-sheet instead
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

    if (!googleSheetUrl) {
      return NextResponse.json(
        { ok: false, error: 'Google Sheet URL is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Get Google session for this specific form
    const googleSession = await getGoogleAuthFromDatabase(refKey)

    if (!googleSession || !googleSession.accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Google authentication required',
          details: {
            suggestion:
              'Please authenticate with Google first to test the Google Sheets connection',
            needsAuth: true,
          },
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    logger.info('[UI API] Testing Google Sheets connection', {
      refKey,
      url: googleSheetUrl,
    })

    // Test the connection and sheet write access
    const testResult = await testWriteGoogleSheet(googleSheetUrl, {
      accessToken: googleSession.accessToken,
      refreshToken: googleSession.refreshToken,
    })

    if (!testResult.success) {
      // If spreadsheet not found, offer to create it
      if (testResult.error?.includes('Spreadsheet not found')) {
        logger.info('[UI API] Spreadsheet not found, will create on first submission')
        return NextResponse.json({
          ok: true,
          warning: 'Spreadsheet will be created on first form submission',
          message: 'The spreadsheet does not exist yet but will be created automatically',
          details: {
            status: 'pending_creation',
            willCreateOnSubmission: true,
          },
        })
      }

      return NextResponse.json(
        {
          ok: false,
          error: testResult.error || 'Failed to connect to Google Sheets',
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // If sheet doesn't exist in the spreadsheet, create it
    if (testResult.sheetExists === false) {
      logger.info('[UI API] Sheet does not exist, creating FormDee Responses sheet')

      // Get form fields to create proper headers
      const headers = ['Timestamp', ...(fields?.map((f: any) => f.label || f.key) || [])]

      // Create the sheet with headers
      const exportResult = await exportResponsesToGoogleSheets(
        googleSheetUrl,
        headers,
        [], // No data, just headers
        {
          accessToken: googleSession.accessToken,
          refreshToken: googleSession.refreshToken,
        }
      )

      if (exportResult.success) {
        return NextResponse.json({
          ok: true,
          message: 'Google Sheets connection successful! Sheet created.',
          details: {
            spreadsheetTitle: testResult.spreadsheetTitle,
            spreadsheetId: testResult.spreadsheetId,
            sheetCreated: true,
            sheetName: 'FormDee Responses',
          },
        })
      }
    }

    // Connection successful
    return NextResponse.json({
      ok: true,
      message: 'Google Sheets connection successful!',
      details: {
        spreadsheetTitle: testResult.spreadsheetTitle,
        spreadsheetId: testResult.spreadsheetId,
        sheetExists: testResult.sheetExists,
        sheetName: testResult.sheetExists ? 'FormDee Responses' : null,
      },
    })
  } catch (error: any) {
    logger.error('[UI API] Test Google Sheet error:', error)
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
