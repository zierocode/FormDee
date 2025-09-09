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
            console.log('Found admin key from API:', data.adminKey.substring(0, 4) + '...')
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
