"use client"
import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider } from './AuthProvider'

export function AdminKeyGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [adminKey, setAdminKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check authentication status and get admin key from API
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check')
        if (!response.ok) {
          // Not authenticated, redirect to login
          router.push('/login?returnUrl=' + encodeURIComponent(window.location.pathname))
        } else {
          // Get admin key from API response
          const data = await response.json()
          if (data.adminKey) {
            console.log('Found admin key from API:', data.adminKey.substring(0, 10) + '...')
            setAdminKey(data.adminKey)
          } else {
            console.warn('No admin key in API response')
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/login?returnUrl=' + encodeURIComponent(window.location.pathname))
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <AuthProvider adminKey={adminKey || ''}>
      {children}
    </AuthProvider>
  )
}

