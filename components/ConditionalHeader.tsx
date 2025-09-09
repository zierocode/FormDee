'use client'
import { useEffect, useState } from 'react'
import { MenuOutlined } from '@ant-design/icons'
import { Layout, Button } from 'antd'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { SettingsDrawer } from './SettingsDrawer'

const { Header } = Layout

export function ConditionalHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [adminKey, setAdminKey] = useState<string>('')

  useEffect(() => {
    // Check authentication status and get admin key
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check')
        if (response.ok) {
          const data = await response.json()
          setIsAuthenticated(true)
          if (data.adminKey) {
            setAdminKey(data.adminKey)
          }
        } else {
          setIsAuthenticated(false)
          setAdminKey('')
          setSettingsOpen(false) // Close drawer when not authenticated
        }
      } catch (error) {
        setIsAuthenticated(false)
        setAdminKey('')
        setSettingsOpen(false) // Close drawer on error
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
        setSettingsOpen(false) // Close drawer before logging out
        toast.success('Logged out successfully')
        router.push('/login')
        router.refresh()
      }
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  return (
    <>
      <Header
        style={{
          background: '#fff',
          padding: 0,
          height: 64,
          lineHeight: '64px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '100%',
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 24px',
          }}
        >
          <a
            href="/builder"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              color: 'inherit',
              height: '100%',
            }}
          >
            <Image
              src="/FormDee-logo.png"
              alt="FormDee Logo"
              width={32}
              height={32}
              style={{ width: 32, height: 32 }}
            />
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#000' }}>
              FormDee - ฟอร์มดี
            </span>
          </a>
          {isAuthenticated && (
            <Button
              type="default"
              icon={<MenuOutlined />}
              onClick={() => setSettingsOpen(true)}
              size="middle"
            >
              Menu
            </Button>
          )}
        </div>
      </Header>

      {/* Menu Drawer */}
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        adminKey={adminKey}
        onLogout={handleLogout}
      />
    </>
  )
}
