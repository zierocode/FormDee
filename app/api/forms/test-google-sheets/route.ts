import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { getGoogleSessionFromCookies } from '@/lib/google-auth'
import { testGoogleSheetsConnectionWithUser } from '@/lib/google-sheets-user'

async function handlePost(req: NextRequest) {
  try {
    // Validate authentication
    const auth = await withApiAuth(req, 'any')

    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: auth.error || ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    const body = await req.json()
    const { googleSheetUrl } = body

    if (!googleSheetUrl) {
      return NextResponse.json(
        { success: false, error: 'Google Sheet URL is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Get Google session from cookies
    const googleSession = getGoogleSessionFromCookies(req)

    if (!googleSession || !googleSession.accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google authentication required',
          needsAuth: true,
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    // Test Google Sheets connection and write permissions
    const testResult = await testGoogleSheetsConnectionWithUser(googleSheetUrl, {
      accessToken: googleSession.accessToken,
      refreshToken: googleSession.refreshToken,
    })

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Google Sheet is accessible and writable',
        spreadsheetTitle: testResult.spreadsheetTitle,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: testResult.error || 'Failed to access Google Sheet',
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
  } catch (error: any) {
    console.error('[API] Test Google Sheets error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || ERROR_MESSAGES.GENERIC,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    )
  }
}

export const POST = handlePost
