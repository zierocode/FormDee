'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function ConditionalMain({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  
  // Don't wrap form pages (routes starting with /f/) in main container
  if (pathname?.startsWith('/f/')) {
    return <>{children}</>
  }

  return (
    <main className="container py-6">{children}</main>
  )
}