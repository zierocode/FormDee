import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'
import { settingsApi } from '@/lib/supabase-client'

export interface Settings {
  aiModel: string
  apiKey: string
}

// Hook to get settings
export function useSettings(adminKey?: string) {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: async () => {
      // Include admin key in headers if provided
      if (adminKey) {
        const response = await fetch('/api/ui/settings', {
          headers: {
            'x-admin-key': adminKey,
          },
          credentials: 'include', // Include cookies for authentication
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch settings')
        }

        return data
      }

      // Otherwise use the default API call
      return settingsApi.getSettings()
    },
    enabled: !!adminKey, // Only fetch when adminKey is available
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 60000, // Keep in cache for 1 minute
    retry: 1, // Only retry once on failure
  })
}

// Hook to update settings with notifications
export function useUpdateSettings(
  adminKey?: string,
  onSuccess?: () => void,
  onError?: (error: Error) => void
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: Settings) => {
      // Include admin key in headers if provided
      if (adminKey) {
        const response = await fetch('/api/ui/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey,
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify(settings),
        })

        const data = await response.json()

        if (!response.ok) {
          // Handle both string error messages and nested error objects
          const errorMessage =
            typeof data.error === 'string'
              ? data.error
              : data.error?.message || data.message || 'Failed to update settings'
          throw new Error(errorMessage)
        }

        return data
      }

      // Otherwise use the default API call
      return settingsApi.updateSettings(settings)
    },
    onSuccess: () => {
      // Invalidate and refetch settings
      queryClient.invalidateQueries({ queryKey: queryKeys.settings })
      onSuccess?.()
    },
    onError: (error: Error) => {
      onError?.(error)
    },
  })
}

// Hook to test settings configuration
export function useTestSettings(
  adminKey?: string,
  onSuccess?: () => void,
  onError?: (error: Error) => void
) {
  return useMutation({
    mutationFn: async (settings: Settings) => {
      // Include admin key in headers if provided
      if (adminKey) {
        const response = await fetch('/api/ui/settings/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey,
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({
            aiModel: settings.aiModel,
            aiApiKey: settings.apiKey,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          // Handle both string error messages and nested error objects
          const errorMessage =
            typeof data.error === 'string'
              ? data.error
              : data.error?.message || data.message || 'Configuration test failed'
          throw new Error(errorMessage)
        }

        return data
      }

      // Otherwise use the default API call
      return settingsApi.testSettings(settings)
    },
    onSuccess: () => {
      onSuccess?.()
    },
    onError: (error: Error) => {
      onError?.(error)
    },
  })
}
