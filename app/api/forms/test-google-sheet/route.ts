import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { getGoogleAuthFromDatabase } from '@/lib/google-auth'
import {
  testGoogleSheetsConnectionWithUser,
  exportResponsesToGoogleSheets,
} from '@/lib/google-sheets-user'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

async function handlePost(req: NextRequest) {
  try {
    // Validate authentication
    const auth = await withApiAuth(req, 'api')

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

    // Test Google Sheets connection using user authentication
    const testResult = await testGoogleSheetsConnectionWithUser(googleSheetUrl, {
      accessToken: googleSession.accessToken,
      refreshToken: googleSession.refreshToken,
    })

    if (testResult.success) {
      // Test writability by attempting to write a test row
      try {
        const { testWriteGoogleSheet } = await import('@/lib/google-sheets-user')
        const writeTest = await testWriteGoogleSheet(googleSheetUrl, {
          accessToken: googleSession.accessToken,
          refreshToken: googleSession.refreshToken,
        })

        if (!writeTest.success) {
          // Check if the sheet needs to be created
          if (writeTest.needsSheetCreation) {
            // Sheet doesn't exist, create it now and export all responses
            logger.info(
              `[Test Google Sheet] Sheet 'FormDee Responses' needs creation, creating and exporting responses`
            )

            // Get existing responses from Supabase if refKey and fields are provided
            if (refKey && fields && Array.isArray(fields)) {
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
                  message: `Sheet 'FormDee Responses' created successfully!`,
                  details: {
                    status: `Created sheet 'FormDee Responses' and exported ${exportResult.rowsAppended || 0} responses`,
                    spreadsheetTitle: testResult.spreadsheetTitle,
                    responsesExported: exportResult.rowsAppended || 0,
                    sheetCreated: true,
                    sheetName: 'FormDee Responses',
                  },
                })
              } else {
                return NextResponse.json(
                  {
                    ok: false,
                    error: exportResult.error || 'Failed to create sheet',
                    details: {
                      suggestion: 'Failed to create the sheet. Please check permissions.',
                    },
                  },
                  { status: HTTP_STATUS.BAD_REQUEST }
                )
              }
            } else {
              // No form data provided, just return that sheet needs creation
              return NextResponse.json({
                ok: true,
                message: 'Google Sheet is accessible!',
                details: {
                  status: `Sheet 'FormDee Responses' will be created when you save`,
                  spreadsheetTitle: testResult.spreadsheetTitle,
                  needsSheetCreation: true,
                  sheetName: 'FormDee Responses',
                },
              })
            }
          }

          return NextResponse.json(
            {
              ok: false,
              error: writeTest.error || 'Google Sheet is not writable',
              details: {
                suggestion: 'Make sure you have edit access to this Google Sheet',
              },
            },
            { status: HTTP_STATUS.BAD_REQUEST }
          )
        }
      } catch (error) {
        // If write test fails, it means we don't have write access
        return NextResponse.json(
          {
            ok: false,
            error: 'Google Sheet is not writable',
            details: {
              suggestion: 'Make sure you have edit access to this Google Sheet',
            },
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      // Sheet exists and is writable - just return success, don't export data
      logger.info('[Test Google Sheet] Sheet exists and is writable')

      return NextResponse.json({
        ok: true,
        message: 'Google Sheet connection test successful!',
        details: {
          status: 'Successfully connected to Google Sheets with write access',
          spreadsheetTitle: testResult.spreadsheetTitle,
          sheetName: 'FormDee Responses',
          note: 'Sheet already exists. Form submissions will be saved to this sheet.',
        },
      })
    } else if (testResult.error?.includes('Spreadsheet not found')) {
      // Spreadsheet doesn't exist, create a new one and export all responses
      logger.info(
        '[Test Google Sheet] Spreadsheet not found, creating new one and exporting responses'
      )

      if (!refKey || !fields || !Array.isArray(fields)) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Cannot create new spreadsheet without form information',
            details: {
              suggestion: 'Please provide form refKey and fields to create a new spreadsheet',
            },
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
          details: {
            status: 'Created new spreadsheet and exported existing responses',
            responsesExported: exportResult.rowsAppended || 0,
            spreadsheetTitle: 'FormDee Responses',
            note: 'The form has been updated with the new Google Sheet URL',
          },
        })
      } else if (exportResult.success) {
        return NextResponse.json({
          ok: true,
          message: 'Google Sheet connection test successful!',
          details: {
            status: 'Successfully connected to Google Sheets',
            note: 'Form submissions will be saved to this sheet using your Google account',
          },
        })
      } else {
        return NextResponse.json(
          {
            ok: false,
            error: exportResult.error || 'Failed to create new Google Sheet',
            details: {
              suggestion: 'Please check your Google account permissions',
            },
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: testResult.error || 'Google Sheets connection test failed',
          details: {
            suggestion: testResult.error?.includes('authentication')
              ? 'Please re-authenticate with Google'
              : 'Make sure you have edit access to this Google Sheet',
          },
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
  } catch (error: any) {
    logger.error('[API] Test Google Sheet error:', error)
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
