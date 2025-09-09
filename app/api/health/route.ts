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
