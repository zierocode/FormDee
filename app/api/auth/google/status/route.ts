import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { validateAccessToken, getGoogleAuthFromDatabase } from '@/lib/google-auth'
import { supabase } from '@/lib/supabase'

// Force dynamic rendering since we use headers for auth
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Check Google authentication status
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

    if (googleAuth) {
      // Validate the access token
      const isValid = await validateAccessToken(googleAuth.accessToken)

      if (isValid) {
        // Get user info from database
        const { data: form } = await supabase
          .from('Forms')
          .select('google_auth_id')
          .eq('refKey', refKey)
          .single()

        if (form?.google_auth_id) {
          const { data: googleAuthData } = await supabase
            .from('GoogleAuth')
            .select('*')
            .eq('id', form.google_auth_id)
            .single()

          if (googleAuthData) {
            return NextResponse.json({
              ok: true,
              data: {
                authenticated: true,
                user: {
                  email: googleAuthData.email,
                  name: googleAuthData.name,
                  picture: googleAuthData.picture,
                },
                expiresAt: googleAuthData.expiry_date,
              },
            })
          }
        }
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
