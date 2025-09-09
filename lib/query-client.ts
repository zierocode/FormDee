import { QueryClient } from '@tanstack/react-query'

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
      refetchOnWindowFocus: false, // Disable automatic refetch on window focus
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
})

// Query keys for consistent caching
export const queryKeys = {
  // Forms
  forms: ['forms'] as const,
  form: (refKey: string) => ['forms', refKey] as const,
  formsList: ['forms', 'list'] as const,

  // Responses
  responses: ['responses'] as const,
  responsesList: (refKey: string) => ['responses', 'list', refKey] as const,
  responsesCount: (refKey: string) => ['responses', 'count', refKey] as const,

  // Auth
  authCheck: ['auth', 'check'] as const,

  // Settings (if needed)
  settings: ['settings'] as const,
} as const
