import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { queryKeys } from '@/lib/query-client'
import { responsesApi } from '@/lib/supabase-client'

// Hook to get responses for a form (admin only)
export function useResponses(
  refKey: string,
  options: {
    limit?: number
    offset?: number
    startDate?: string
    endDate?: string
  } = {}
) {
  return useQuery({
    queryKey: [...queryKeys.responsesList(refKey), options],
    queryFn: () => responsesApi.getResponses(refKey, options),
    enabled: !!refKey,
  })
}

// Hook to get response count for a form (admin only)
export function useResponseCount(refKey: string) {
  return useQuery({
    queryKey: queryKeys.responsesCount(refKey),
    queryFn: () => responsesApi.getResponseCount(refKey),
    enabled: !!refKey,
  })
}

// Hook to get response statistics for a form (admin only)
export function useResponseStats(refKey: string) {
  return useQuery({
    queryKey: [...queryKeys.responsesList(refKey), 'stats'],
    queryFn: () => responsesApi.getResponseStats(refKey),
    enabled: !!refKey,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Hook to submit a form response (public)
export function useSubmitResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ refKey, values }: { refKey: string; values: Record<string, any> }) =>
      responsesApi.submitResponse(refKey, values),
    onSuccess: (_data, variables) => {
      // Invalidate responses list for this form
      queryClient.invalidateQueries({
        queryKey: queryKeys.responsesList(variables.refKey),
      })
      // Invalidate response count for this form
      queryClient.invalidateQueries({
        queryKey: queryKeys.responsesCount(variables.refKey),
      })
      // Show success message
      toast.success('Response submitted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit response: ${error.message}`)
    },
  })
}

// Hook to prefetch responses (useful for performance optimization)
export function usePrefetchResponses() {
  const queryClient = useQueryClient()

  return (
    refKey: string,
    options: {
      limit?: number
      offset?: number
      startDate?: string
      endDate?: string
    } = {}
  ) => {
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.responsesList(refKey), options],
      queryFn: () => responsesApi.getResponses(refKey, options),
      staleTime: 1000 * 60 * 2, // 2 minutes (responses change more frequently)
    })
  }
}
