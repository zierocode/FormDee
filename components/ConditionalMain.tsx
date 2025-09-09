'use client'
import type { ReactNode } from 'react'
import { Layout } from 'antd'
import { usePathname } from 'next/navigation'

const { Content } = Layout

export function ConditionalMain({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Don't wrap form pages (routes starting with /f/), login page, or home page in main container
  if (pathname?.startsWith('/f/') || pathname === '/login' || pathname === '/') {
    return <>{children}</>
  }

  return (
    <Content
      style={{
        padding: '24px',
        minHeight: 'calc(100vh - 64px)',
        background: '#f5f5f5',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {children}
      </div>
    </Content>
  )
}
