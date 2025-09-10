'use client'
import { ReactNode, useEffect, useState } from 'react'
import { Spin } from 'antd'
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
          setLoading(false)
        } else {
          // Get admin key from API response
          const data = await response.json()
          if (data.adminKey) {
            // Admin key found
            setAdminKey(data.adminKey)
          } else {
            // No admin key in API response
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  return <AuthProvider adminKey={adminKey || ''}>{children}</AuthProvider>
}
