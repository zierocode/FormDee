import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { getGoogleAuthFromDatabase } from '@/lib/google-auth'
import {
  testGoogleSheetsConnectionWithUser,
  testWriteGoogleSheet,
  exportResponsesToGoogleSheets,
} from '@/lib/google-sheets-user'
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
    const { googleSheetUrl, refKey, fields } = body

    if (!googleSheetUrl) {
      return NextResponse.json(
        { ok: false, error: 'Google Sheet URL is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    if (!refKey) {
      return NextResponse.json(
        { ok: false, error: 'Form refKey is required' },
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
            suggestion: 'Please authenticate with Google first',
            needsAuth: true,
          },
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    // First check if sheet exists
    const testResult = await testGoogleSheetsConnectionWithUser(googleSheetUrl, {
      accessToken: googleSession.accessToken,
      refreshToken: googleSession.refreshToken,
    })

    if (!testResult.success && testResult.error?.includes('Spreadsheet not found')) {
      // Sheet doesn't exist - create it and export all responses
      logger.info(
        '[Validate Google Sheet] Spreadsheet not found, creating new one and exporting responses'
      )

      if (!refKey || !fields || !Array.isArray(fields)) {
        // No form data provided, can't create sheet
        return NextResponse.json(
          {
            ok: false,
            error: 'Cannot create new spreadsheet without form information',
            needsFormData: true,
          },
          { status: HTTP_STATUS.BAD_REQUEST }
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
      }

      // Prepare headers and response data
      const headers = ['Timestamp', ...fields.map((field: any) => field.label || field.key)]
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

      // Export to Google Sheets (will create new one automatically)
      const exportResult = await exportResponsesToGoogleSheets(
        googleSheetUrl,
        headers,
        responseData,
        {
          accessToken: googleSession.accessToken,
          refreshToken: googleSession.refreshToken,
        }
      )

      if (exportResult.success && exportResult.newSpreadsheetUrl) {
        // Update the form with the new URL
        if (refKey) {
          const { error: updateError } = await supabase
            .from('Forms')
            .update({ googleSheetUrl: exportResult.newSpreadsheetUrl })
            .eq('refKey', refKey)

          if (updateError) {
            logger.error('Failed to update form with new Google Sheet URL:', updateError)
          }
        }

        return NextResponse.json({
          ok: true,
          message: 'New Google Sheet created successfully!',
          newSpreadsheetUrl: exportResult.newSpreadsheetUrl,
          newSpreadsheetCreated: true,
          details: {
            status: 'Created new spreadsheet and exported existing responses',
            responsesExported: exportResult.rowsAppended || 0,
            spreadsheetTitle: 'FormDee Responses',
          },
        })
      } else if (!exportResult.success) {
        return NextResponse.json(
          {
            ok: false,
            error: exportResult.error || 'Failed to create new Google Sheet',
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }
    } else if (!testResult.success) {
      // Other error (not "not found")
      return NextResponse.json(
        {
          ok: false,
          error: testResult.error || 'The Google Sheet is not accessible.',
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Sheet exists, check if it's writable
    const writeTest = await testWriteGoogleSheet(googleSheetUrl, {
      accessToken: googleSession.accessToken,
      refreshToken: googleSession.refreshToken,
    })

    if (!writeTest.success) {
      // Check if it's just that the sheet needs to be created
      if (writeTest.needsSheetCreation) {
        // Sheet needs to be created - create it now and export all responses
        logger.info(
          '[Validate Google Sheet] Sheet needs creation, creating and exporting responses'
        )

        // Get existing responses from Supabase
        const { data: responses, error: responsesError } = await supabase
          .from('Responses')
          .select('*')
          .eq('refKey', refKey)
          .order('submittedAt', { ascending: true })

        if (responsesError) {
          logger.error('Error fetching responses:', responsesError)
        }

        // Prepare headers and response data
        const headers = ['Timestamp', ...fields.map((field: any) => field.label || field.key)]
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

        // Export to Google Sheets (will create the sheet automatically)
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
          return NextResponse.json({
            ok: true,
            message: `Sheet 'FormDee Responses' created and ${exportResult.rowsAppended || 0} responses exported`,
            details: {
              spreadsheetTitle: testResult.spreadsheetTitle,
              sheetCreated: true,
              sheetName: 'FormDee Responses',
              responsesExported: exportResult.rowsAppended || 0,
            },
          })
        } else {
          return NextResponse.json(
            {
              ok: false,
              error: exportResult.error || 'Failed to create sheet',
            },
            { status: HTTP_STATUS.BAD_REQUEST }
          )
        }
      }

      // Sheet exists but not writable
      return NextResponse.json(
        {
          ok: false,
          error: writeTest.error || 'You need edit permissions for this Google Sheet.',
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Both checks passed
    return NextResponse.json({
      ok: true,
      message: 'Google Sheet is valid and writable',
      details: {
        spreadsheetTitle: testResult.spreadsheetTitle,
      },
    })
  } catch (error: any) {
    logger.error('[API] Validate Google Sheet error:', error)
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
