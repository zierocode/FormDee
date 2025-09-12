import { NextRequest, NextResponse } from 'next/server'
import { metricsCollector } from '@/lib/server/api-middleware'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const detailed = searchParams.get('detailed') === 'true'

  try {
    // Get health status
    const health = metricsCollector.getHealthStatus()

    // Add Supabase health check if detailed
    if (detailed) {
      let supabaseStatus = 'healthy'
      try {
        // Simple Supabase connection test
        const { error } = await supabase.from('Forms').select('count').limit(1)
        if (error) supabaseStatus = 'unhealthy'
      } catch (e) {
        supabaseStatus = 'unhealthy'
      }

      return NextResponse.json({
        ...health,
        supabase: { status: supabaseStatus },
        environment: {
          nodeVersion: process.version,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeEnv: process.env.NODE_ENV,
          // Add a custom env indicator (set this in your .env files)
          envFile: process.env.ENV_FILE_INDICATOR || 'unknown',
          // Check for production-specific vars
          hasProductionVars: {
            supabase: !!process.env.SUPABASE_URL,
            r2: !!process.env.R2_BUCKET_NAME,
            adminKey: !!process.env.ADMIN_API_KEY,
          },
        },
      })
    }

    // Simple health check
    return NextResponse.json({
      status: health.status,
      timestamp: health.timestamp,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date(),
      },
      { status: 503 }
    )
  }
}
