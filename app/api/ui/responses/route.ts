import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'

/**
 * UI-only endpoint for viewing form responses
 *
 * IMPORTANT: This endpoint is ONLY for UI/browser access
 * - Uses UI authentication (cookie-based)
 * - DO NOT modify to accept API keys
 * - For API access, use /api/responses instead
 *
 * Security: UI key only - never accept API keys here
 */

function errorResponse(message: string, code: number = HTTP_STATUS.BAD_REQUEST) {
  return NextResponse.json(
    { ok: false, error: { code: String(code), message } },
    { status: code as any }
  )
}

/**
 * GET /api/ui/responses - Fetch form responses from Supabase
 * Query params:
 * - refKey: Filter by form reference key
 * - limit: Maximum number of responses to return (default: 100)
 * - offset: Skip this many responses (for pagination)
 * - startDate: Filter responses after this date
 * - endDate: Filter responses before this date
 */
async function handleGet(req: NextRequest) {
  try {
    // Validate UI authentication
    const auth = await withApiAuth(req, 'ui')
    if (!auth.authenticated) {
      return errorResponse(auth.error || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const { searchParams } = new URL(req.url)
    const refKey = searchParams.get('refKey')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build query
    let query = supabase.from('Responses').select('*', { count: 'exact' })

    // Apply filters
    if (refKey) {
      query = query.eq('refKey', refKey)
    }

    if (startDate) {
      query = query.gte('submittedAt', startDate)
    }

    if (endDate) {
      query = query.lte('submittedAt', endDate)
    }

    // Apply pagination and ordering
    query = query.order('submittedAt', { ascending: false }).range(offset, offset + limit - 1)

    // Execute query
    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      ok: true,
      data: data || [],
      count: count || 0,
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    })
  } catch (error: any) {
    console.error('[UI API] Responses GET error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.GENERIC,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

/**
 * POST /api/ui/responses - Export or process responses
 * This handles bulk operations on responses
 */
async function handlePost(req: NextRequest) {
  try {
    // Validate UI authentication
    const auth = await withApiAuth(req, 'ui')
    if (!auth.authenticated) {
      return errorResponse(auth.error || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const body = await req.json()
    const { action, refKey, responseIds } = body

    switch (action) {
      case 'export':
        // Export responses (could be CSV, JSON, etc.)
        if (!refKey) {
          return errorResponse('Reference key is required for export', HTTP_STATUS.BAD_REQUEST)
        }

        const { data: responses, error } = await supabase
          .from('Responses')
          .select('*')
          .eq('refKey', refKey)
          .order('submittedAt', { ascending: false })

        if (error) {
          throw new Error(error.message)
        }

        return NextResponse.json({
          ok: true,
          data: responses || [],
          format: 'json',
        })

      case 'delete':
        // Delete specific responses
        if (!responseIds || !Array.isArray(responseIds)) {
          return errorResponse('Response IDs are required for deletion', HTTP_STATUS.BAD_REQUEST)
        }

        const { error: deleteError } = await supabase
          .from('Responses')
          .delete()
          .in('id', responseIds)

        if (deleteError) {
          throw new Error(deleteError.message)
        }

        return NextResponse.json({
          ok: true,
          message: `${responseIds.length} responses deleted successfully`,
        })

      default:
        return errorResponse('Invalid action', HTTP_STATUS.BAD_REQUEST)
    }
  } catch (error: any) {
    console.error('[UI API] Responses POST error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.GENERIC,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

export async function GET(req: NextRequest) {
  return handleGet(req)
}

export async function POST(req: NextRequest) {
  return handlePost(req)
}
