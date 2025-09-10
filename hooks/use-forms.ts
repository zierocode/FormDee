import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notification } from 'antd'
import { queryKeys } from '@/lib/query-client'
import { formsApi } from '@/lib/supabase-client'
import { FormConfig } from '@/lib/types'

// Hook to get a single form (public - no auth required)
export function useForm(refKey: string) {
  return useQuery({
    queryKey: queryKeys.form(refKey),
    queryFn: () => formsApi.getForm(refKey),
    enabled: !!refKey,
  })
}

// Hook to get all forms (admin only)
export function useForms() {
  return useQuery({
    queryKey: queryKeys.formsList,
    queryFn: () => formsApi.getForms(),
  })
}

// Hook to create or update a form (admin only)
export function useUpsertForm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (form: FormConfig) => formsApi.upsertForm(form),
    onSuccess: (data) => {
      // Invalidate and refetch forms list
      queryClient.invalidateQueries({ queryKey: queryKeys.formsList })
      // Update the specific form cache
      queryClient.setQueryData(queryKeys.form(data.refKey), data)
      // Show success message
      notification.success({
        message: 'Form Saved',
        description: 'Form saved successfully',
        placement: 'bottomRight',
      })
    },
    onError: (error: Error) => {
      notification.error({
        message: 'Save Failed',
        description: `Failed to save form: ${error.message}`,
        placement: 'bottomRight',
      })
    },
  })
}

// Hook to delete a form (admin only)
export function useDeleteForm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (refKey: string) => formsApi.deleteForm(refKey),
    onSuccess: (_, refKey) => {
      // Remove from forms list cache
      queryClient.invalidateQueries({ queryKey: queryKeys.formsList })
      // Remove the specific form from cache
      queryClient.removeQueries({ queryKey: queryKeys.form(refKey) })
      // Show success message
      notification.success({
        message: 'Form Deleted',
        description: 'Form deleted successfully',
        placement: 'bottomRight',
      })
    },
    onError: (error: Error) => {
      notification.error({
        message: 'Delete Failed',
        description: `Failed to delete form: ${error.message}`,
        placement: 'bottomRight',
      })
    },
  })
}

// Hook to prefetch a form (useful for performance optimization)
export function usePrefetchForm() {
  const queryClient = useQueryClient()

  return (refKey: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.form(refKey),
      queryFn: () => formsApi.getForm(refKey),
      staleTime: 1000 * 60 * 5, // 5 minutes
    })
  }
}
