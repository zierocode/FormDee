"use client"
import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function AdminKeyGate({ children }: { children: ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check')
        if (!response.ok) {
          // Not authenticated, redirect to login
          router.push('/login?returnUrl=' + encodeURIComponent(window.location.pathname))
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/login?returnUrl=' + encodeURIComponent(window.location.pathname))
      }
    }

    checkAuth()
  }, [router])

  return <>{children}</>
}

