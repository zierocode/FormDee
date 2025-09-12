import { useQuery } from '@tanstack/react-query'

interface StorageStats {
  summary: {
    totalFiles: number
    totalSize: number
    totalSizeFormatted: string
    usedPercentage: string
    remainingStorage: number
    remainingStorageFormatted: string
    maxStorage: number
    maxStorageFormatted: string
  }
  limits: {
    plan: string
    maxStorage: string
    maxOperationsPerMonth: string
  }
}

async function fetchStorageStats(): Promise<StorageStats> {
  // Use the UI endpoint which accepts UI authentication only
  const response = await fetch('/api/ui/storage', {
    credentials: 'include', // Include cookies for UI auth
  })

  if (!response.ok) {
    throw new Error('Failed to fetch storage stats')
  }

  const data = await response.json()
  return data.data
}

export function useStorageStats() {
  return useQuery({
    queryKey: ['storage-stats'],
    queryFn: fetchStorageStats,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}
