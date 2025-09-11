import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

// Force dynamic rendering since we use headers for auth
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Logout from Google authentication - clear persistent auth
 */
async function handlePost(req: NextRequest) {
  try {
    // Validate authentication first
    const auth = await withApiAuth(req, 'any')

    if (!auth.authenticated) {
      return NextResponse.json(
        { ok: false, error: auth.error || ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    // Get the email from the request body (optional - to logout specific account)
    const body = await req.json().catch(() => ({}))
    const { email } = body

    if (email) {
      // Delete specific Google auth by email
      const { error: deleteError } = await supabase.from('GoogleAuth').delete().eq('email', email)

      if (deleteError) {
        logger.error('[Google Logout] Failed to delete auth from database:', deleteError)
      } else {
        logger.info(`[Google Logout] Cleared Google auth for email: ${email}`)
      }
    } else {
      // If no email specified, clear all Google auth from database
      const { error: deleteAllError } = await supabase
        .from('GoogleAuth')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using impossible UUID)

      if (!deleteAllError) {
        logger.info('[Google Logout] Cleared all Google auth from database')
      }
    }

    // Create response
    const response = NextResponse.json({
      ok: true,
      data: {
        message: 'Successfully logged out from Google',
      },
    })

    // Clear any legacy cookie (for cleanup)
    response.cookies.set('google-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    })

    return response
  } catch (error: any) {
    logger.error('[API] Google logout error:', error)
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
