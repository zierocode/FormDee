'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

export function ConditionalHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check')
        setIsAuthenticated(response.ok)
      } catch (error) {
        setIsAuthenticated(false)
      }
    }
    checkAuth()
  }, [pathname])
  
  // Hide header on form pages (routes starting with /f/), home page, and login page
  if (pathname?.startsWith('/f/') || pathname === '/' || pathname === '/login') {
    return null
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Logged out successfully')
        router.push('/login')
        router.refresh()
      }
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  return (
    <header className="border-b bg-white">
      <div className="container flex items-center justify-between py-4">
        <a href="/" className="flex items-center gap-2">
          <Image 
            src="/FormDee-logo.png" 
            alt="FormDee Logo" 
            width={32} 
            height={32}
            className="w-8 h-8"
          />
          <span className="text-lg font-semibold">FormDee - ฟอร์มดี</span>
        </a>
        {isAuthenticated && (
          <button
            className="btn-secondary text-sm"
            onClick={handleLogout}
          >
            Logout
          </button>
        )}
      </div>
    </header>
  )
}

