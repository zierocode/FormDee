'use client'
import { useEffect, useState } from 'react'
import { MenuOutlined } from '@ant-design/icons'
import { Layout, Button, notification } from 'antd'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { SettingsDrawer } from './SettingsDrawer'

const { Header } = Layout

export function ConditionalHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, adminKey } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Hide header on form pages (routes starting with /f/), home page, and login page
  const shouldHideHeader = pathname?.startsWith('/f/') || pathname === '/' || pathname === '/login'

  useEffect(() => {
    // Close settings drawer when not authenticated
    if (!isAuthenticated) {
      setSettingsOpen(false)
    }
  }, [isAuthenticated])

  if (shouldHideHeader) {
    return null
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (response.ok) {
        setSettingsOpen(false) // Close drawer before logging out
        notification.success({
          message: 'Logged Out',
          description: 'Logged out successfully',
          placement: 'bottomRight',
        })
        router.push('/login')
        router.refresh()
      }
    } catch (error) {
      notification.error({
        message: 'Logout Failed',
        description: 'Failed to logout',
        placement: 'bottomRight',
      })
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

      {/* Menu Drawer - Only render when authenticated and have adminKey */}
      {isAuthenticated && adminKey && (
        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          adminKey={adminKey}
          onLogout={handleLogout}
        />
      )}
    </>
  )
}
