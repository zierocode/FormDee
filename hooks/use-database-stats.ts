import { useQuery } from '@tanstack/react-query'

interface DatabaseStats {
  database: {
    size: number
    sizeFormatted: string
    limit: number
    limitFormatted: string
    usagePercentage: string
    remaining: number
    remainingFormatted: string
  }
  tables: {
    forms: {
      count: number
      estimated_size: number
      sizeFormatted: string
    }
    responses: {
      count: number
      estimated_size: number
      sizeFormatted: string
    }
    googleAuth: {
      count: number
      estimated_size: number
      sizeFormatted: string
    }
    apiKeyLogs: {
      count: number
      estimated_size: number
      sizeFormatted: string
    }
  }
  limits: {
    plan: string
    database: string
    apiRequests: string
    storage: string
    bandwidth: string
    edgeFunctions: string
  }
  health: {
    status: 'healthy' | 'warning' | 'critical' | 'unknown'
    message: string
  }
  error?: {
    message: string
    details: string
  }
}

async function fetchDatabaseStats(): Promise<DatabaseStats> {
  const response = await fetch('/api/ui/supabase-stats', {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch database stats')
  }

  const data = await response.json()
  return data.data
}

export function useDatabaseStats() {
  return useQuery({
    queryKey: ['database-stats'],
    queryFn: fetchDatabaseStats,
    refetchInterval: 30000,
    staleTime: 10000,
  })
}
