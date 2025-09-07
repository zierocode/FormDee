import { NextRequest, NextResponse } from 'next/server'
import { metricsCollector } from '@/lib/server/api-middleware'
import { gasConnector } from '@/lib/server/gas-optimized'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const detailed = searchParams.get('detailed') === 'true'

  try {
    // Get health status
    const health = metricsCollector.getHealthStatus()
    
    // Get GAS metrics if detailed
    if (detailed) {
      const gasMetrics = gasConnector.getMetrics()
      
      return NextResponse.json({
        ...health,
        gas: gasMetrics,
        environment: {
          nodeVersion: process.version,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        }
      })
    }

    // Simple health check
    return NextResponse.json({
      status: health.status,
      timestamp: health.timestamp
    })

  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      },
      { status: 503 }
    )
  }
}