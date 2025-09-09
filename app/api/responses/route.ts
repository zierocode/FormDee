import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'

function errorResponse(message: string, code: number = HTTP_STATUS.BAD_REQUEST) {
  return NextResponse.json(
    { ok: false, error: { code: String(code), message } },
    { status: code as any }
  )
}

/**
 * GET /api/responses - Fetch form responses from Supabase
 * Query params:
 * - refKey: Filter by form reference key
 * - limit: Maximum number of responses to return (default: 100)
 * - offset: Skip this many responses (for pagination)
 * - startDate: Filter responses after this date
 * - endDate: Filter responses before this date
 */
async function handleGet(req: NextRequest) {
  try {
    // Validate authentication - responses require API or UI key
    const auth = await withApiAuth(req, 'any')
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
    let query = supabase
      .from('Responses')
      .select('*')
      .order('submittedAt', { ascending: false })
      .range(offset, offset + limit - 1)

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

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching responses:', error)
      return errorResponse('Failed to fetch responses', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Get total count for pagination
    let totalCount = count
    if (totalCount === null) {
      // Fetch total count separately if not provided
      const countQuery = supabase.from('Responses').select('*', { count: 'exact', head: true })

      if (refKey) {
        countQuery.eq('refKey', refKey)
      }
      if (startDate) {
        countQuery.gte('submittedAt', startDate)
      }
      if (endDate) {
        countQuery.lte('submittedAt', endDate)
      }

      const { count: totalRows } = await countQuery
      totalCount = totalRows || 0
    }

    return NextResponse.json({
      ok: true,
      data: data || [],
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < (totalCount || 0),
      },
    })
  } catch (error: any) {
    console.error('[API] Responses GET error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.GENERIC,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

/**
 * DELETE /api/responses - Delete form responses from Supabase
 * Query params:
 * - refKey: Delete only responses for this form
 * - responseId: Delete specific response by ID
 * - all: Delete all responses (requires confirmation)
 */
async function handleDelete(req: NextRequest) {
  try {
    // Validate authentication - responses require API or UI key
    const auth = await withApiAuth(req, 'any')
    if (!auth.authenticated) {
      return errorResponse(auth.error || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const { searchParams } = new URL(req.url)
    const refKey = searchParams.get('refKey')
    const responseId = searchParams.get('responseId')
    const deleteAll = searchParams.get('all') === 'true'

    // Build delete query
    let query = supabase.from('Responses').delete()

    if (responseId) {
      // Delete specific response
      query = query.eq('id', responseId)
    } else if (refKey) {
      // Delete all responses for a specific form
      query = query.eq('refKey', refKey)
    } else if (deleteAll) {
      // Delete all responses (dangerous!)
      // No additional filter needed
    } else {
      return errorResponse('Must specify responseId, refKey, or all=true', HTTP_STATUS.BAD_REQUEST)
    }

    const { error, count } = await query

    if (error) {
      console.error('Error deleting responses:', error)
      return errorResponse('Failed to delete responses', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json({
      ok: true,
      message: `Deleted ${count || 0} response(s)`,
      deletedCount: count || 0,
    })
  } catch (error: any) {
    console.error('[API] Responses DELETE error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.GENERIC,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

// Export handlers
export const GET = handleGet
export const DELETE = handleDelete

// Add OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
      'Access-Control-Max-Age': '86400',
    },
  })
}
