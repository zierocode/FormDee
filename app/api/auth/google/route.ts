import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { getAuthUrl } from '@/lib/google-auth'

// Force dynamic rendering since we use headers for auth
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Initiate Google OAuth2 authentication flow
 */
async function handleGet(req: NextRequest) {
  try {
    // Validate authentication first
    const auth = await withApiAuth(req, 'any')

    if (!auth.authenticated) {
      return NextResponse.json(
        { ok: false, error: auth.error || ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
        },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      )
    }

    // Check if popup mode is requested
    const { searchParams } = new URL(req.url)
    const isPopup = searchParams.get('popup') === 'true'

    // Generate authentication URL
    const authUrl = getAuthUrl(isPopup)

    return NextResponse.json({
      ok: true,
      data: {
        authUrl,
        popup: isPopup,
      },
    })
  } catch (error: any) {
    console.error('[API] Google auth initiation error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || ERROR_MESSAGES.GENERIC,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    )
  }
}

export const GET = handleGet
