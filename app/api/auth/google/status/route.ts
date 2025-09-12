import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { validateAccessToken, getGoogleAuthFromDatabase } from '@/lib/google-auth'

// Force dynamic rendering since we use headers for auth
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Check Google authentication status
 */
async function handleGet(req: NextRequest) {
  try {
    // Validate authentication first
    const auth = await withApiAuth(req, 'ui')

    if (!auth.authenticated) {
      return NextResponse.json(
        { ok: false, error: auth.error || ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    // Get refKey from query parameters
    const { searchParams } = new URL(req.url)
    const refKey = searchParams.get('refKey')

    if (!refKey) {
      return NextResponse.json(
        { ok: false, error: 'Form refKey is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Get Google auth for this specific form
    const googleAuth = await getGoogleAuthFromDatabase(refKey)

    if (googleAuth && googleAuth.email) {
      // Validate the access token
      const isValid = await validateAccessToken(googleAuth.accessToken)

      if (isValid) {
        return NextResponse.json({
          ok: true,
          data: {
            authenticated: true,
            user: {
              email: googleAuth.email,
              name: googleAuth.name,
              picture: googleAuth.picture,
            },
            expiresAt: googleAuth.expiryDate,
          },
        })
      } else {
        // Token expired, needs re-authentication
        return NextResponse.json({
          ok: true,
          data: {
            authenticated: false,
            user: null,
            needsReauth: true,
          },
        })
      }
    }

    // No auth found in database
    return NextResponse.json({
      ok: true,
      data: {
        authenticated: false,
        user: null,
      },
    })
  } catch (error: any) {
    console.error('[API] Google auth status check error:', error)
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
