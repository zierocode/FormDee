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

    // Get the refKey from the request body
    const body = await req.json().catch(() => ({}))
    const { refKey } = body

    if (!refKey) {
      return NextResponse.json(
        { ok: false, error: 'Form refKey is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Remove Google auth from the specific form
    const { error: updateError } = await supabase
      .from('Forms')
      .update({ google_auth_id: null })
      .eq('refKey', refKey)

    if (updateError) {
      logger.error('[Google Logout] Failed to unlink auth from form:', updateError)
      return NextResponse.json(
        { ok: false, error: 'Failed to logout from Google' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      )
    } else {
      logger.info(`[Google Logout] Unlinked Google auth from form: ${refKey}`)
    }

    // Create response
    const response = NextResponse.json({
      ok: true,
      data: {
        message: 'Successfully logged out from Google',
      },
    })

    // No more cookie cleanup needed - auth is only in database

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
