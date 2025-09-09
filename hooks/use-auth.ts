import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { queryKeys } from '@/lib/query-client'

// Hook to check authentication status
export function useAuthCheck() {
  return useQuery({
    queryKey: queryKeys.authCheck,
    queryFn: async () => {
      const response = await fetch('/api/auth/check')
      const data = await response.json()
      return data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry auth checks
  })
}

// Hook to login
export function useLogin() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (adminKey: string) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminKey }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      return data
    },
    onSuccess: (data, _variables, _context) => {
      // Update auth status cache
      queryClient.setQueryData(queryKeys.authCheck, {
        authenticated: true,
        user: data.user,
      })

      // Show success message
      toast.success('Login successful')

      // Redirect to builder or return URL
      const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || '/builder'
      router.push(returnUrl)
      router.refresh()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Hook to logout
export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      return response.json()
    },
    onSuccess: () => {
      // Clear auth status cache
      queryClient.setQueryData(queryKeys.authCheck, { authenticated: false })

      // Clear all cached data that requires authentication
      queryClient.removeQueries({ queryKey: queryKeys.formsList })
      queryClient.removeQueries({ queryKey: queryKeys.responses })

      // Show success message
      toast.success('Logged out successfully')

      // Redirect to login
      router.push('/login')
    },
    onError: (error: Error) => {
      toast.error(`Logout failed: ${error.message}`)
    },
  })
}
