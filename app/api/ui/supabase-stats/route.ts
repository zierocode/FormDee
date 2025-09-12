import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

/**
 * UI-only endpoint for Supabase database statistics
 *
 * IMPORTANT: This endpoint is ONLY for UI/browser access
 * - Uses UI authentication (cookie-based)
 * - DO NOT modify to accept API keys
 * - For API access, create a separate /api/supabase-stats endpoint
 *
 * Security: UI key only - never accept API keys here
 */

// Supabase plan limits (Free tier)
const SUPABASE_LIMITS = {
  free: {
    database: 500 * 1024 * 1024, // 500 MB
    apiRequests: 500000, // 500k per month
    storage: 1 * 1024 * 1024 * 1024, // 1 GB
    bandwidth: 2 * 1024 * 1024 * 1024, // 2 GB
    edgeFunctions: 500000, // 500k invocations
  },
  pro: {
    database: 8 * 1024 * 1024 * 1024, // 8 GB
    apiRequests: 5000000, // 5M per month
    storage: 100 * 1024 * 1024 * 1024, // 100 GB
    bandwidth: 250 * 1024 * 1024 * 1024, // 250 GB
    edgeFunctions: 2000000, // 2M invocations
  },
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function calculatePercentage(used: number, limit: number): string {
  if (limit === 0) return '0'
  return ((used / limit) * 100).toFixed(1)
}

export async function GET(req: NextRequest) {
  try {
    // Validate UI authentication only - NEVER change to 'any' or 'api'
    const auth = await withApiAuth(req, 'ui')

    if (!auth.authenticated) {
      return NextResponse.json(
        { ok: false, error: { message: ERROR_MESSAGES.UNAUTHORIZED } },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    // Get database size using Supabase SQL
    const { data: dbSizeData, error: _dbSizeError } = await supabase.rpc('get_database_size')

    // Get table sizes
    const { data: _tableData, error: _tableError } = await supabase.rpc('get_table_sizes')

    // Get row counts for main tables
    const { count: formsCount } = await supabase
      .from('Forms')
      .select('*', { count: 'exact', head: true })

    const { count: responsesCount } = await supabase
      .from('Responses')
      .select('*', { count: 'exact', head: true })

    const { count: googleAuthCount } = await supabase
      .from('GoogleAuth')
      .select('*', { count: 'exact', head: true })

    const { count: apiKeyLogsCount } = await supabase
      .from('ApiKeyLogs')
      .select('*', { count: 'exact', head: true })

    // Determine plan (for now assuming free tier, could be fetched from organization API)
    const currentPlan = 'free'
    const limits = SUPABASE_LIMITS[currentPlan]

    // Calculate database size (fallback to estimate if RPC fails)
    let databaseSize = 0
    if (dbSizeData) {
      databaseSize = parseInt(dbSizeData) || 0
    } else {
      // Estimate based on row counts (rough estimate)
      databaseSize =
        (formsCount || 0) * 5000 + (responsesCount || 0) * 2000 + (apiKeyLogsCount || 0) * 500
    }

    // Calculate usage percentages
    const dbUsagePercentage = calculatePercentage(databaseSize, limits.database)

    // Prepare response
    const response = {
      ok: true,
      data: {
        database: {
          size: databaseSize,
          sizeFormatted: formatBytes(databaseSize),
          limit: limits.database,
          limitFormatted: formatBytes(limits.database),
          usagePercentage: dbUsagePercentage,
          remaining: limits.database - databaseSize,
          remainingFormatted: formatBytes(limits.database - databaseSize),
        },
        tables: {
          forms: {
            count: formsCount || 0,
            estimated_size: (formsCount || 0) * 5000,
            sizeFormatted: formatBytes((formsCount || 0) * 5000),
          },
          responses: {
            count: responsesCount || 0,
            estimated_size: (responsesCount || 0) * 2000,
            sizeFormatted: formatBytes((responsesCount || 0) * 2000),
          },
          googleAuth: {
            count: googleAuthCount || 0,
            estimated_size: (googleAuthCount || 0) * 1000,
            sizeFormatted: formatBytes((googleAuthCount || 0) * 1000),
          },
          apiKeyLogs: {
            count: apiKeyLogsCount || 0,
            estimated_size: (apiKeyLogsCount || 0) * 500,
            sizeFormatted: formatBytes((apiKeyLogsCount || 0) * 500),
          },
        },
        limits: {
          plan: currentPlan,
          database: formatBytes(limits.database),
          apiRequests: limits.apiRequests.toLocaleString(),
          storage: formatBytes(limits.storage),
          bandwidth: formatBytes(limits.bandwidth),
          edgeFunctions: limits.edgeFunctions.toLocaleString(),
        },
        health: {
          status:
            parseFloat(dbUsagePercentage) > 90
              ? 'critical'
              : parseFloat(dbUsagePercentage) > 70
                ? 'warning'
                : 'healthy',
          message:
            parseFloat(dbUsagePercentage) > 90
              ? 'Database usage is critical. Consider upgrading your plan.'
              : parseFloat(dbUsagePercentage) > 70
                ? 'Database usage is high. Monitor closely.'
                : 'Database usage is healthy.',
        },
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    logger.error('[UI API] Supabase stats error:', error)

    // Return partial data even if some queries fail
    return NextResponse.json({
      ok: true,
      data: {
        database: {
          size: 0,
          sizeFormatted: 'Unable to fetch',
          limit: SUPABASE_LIMITS.free.database,
          limitFormatted: formatBytes(SUPABASE_LIMITS.free.database),
          usagePercentage: '0',
          remaining: SUPABASE_LIMITS.free.database,
          remainingFormatted: formatBytes(SUPABASE_LIMITS.free.database),
        },
        tables: {
          forms: { count: 0, estimated_size: 0, sizeFormatted: '0 Bytes' },
          responses: { count: 0, estimated_size: 0, sizeFormatted: '0 Bytes' },
          googleAuth: { count: 0, estimated_size: 0, sizeFormatted: '0 Bytes' },
          apiKeyLogs: { count: 0, estimated_size: 0, sizeFormatted: '0 Bytes' },
        },
        limits: {
          plan: 'free',
          database: '500 MB',
          apiRequests: '500,000',
          storage: '1 GB',
          bandwidth: '2 GB',
          edgeFunctions: '500,000',
        },
        health: {
          status: 'unknown',
          message: 'Unable to determine database health status',
        },
        error: {
          message: 'Some statistics could not be fetched',
          details: error.message,
        },
      },
    })
  }
}
