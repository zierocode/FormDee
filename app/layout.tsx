import './globals.css'
import type { ReactNode } from 'react'
import { ConditionalHeader } from '@/components/ConditionalHeader'
import { ConditionalMain } from '@/components/ConditionalMain'

export const metadata = {
  title: 'FormDee - ฟอร์มดี',
  description: 'Build and share forms easily - สร้างและแชร์ฟอร์มได้ง่าย ๆ',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConditionalHeader />
        <ConditionalMain>{children}</ConditionalMain>
      </body>
    </html>
  )
}

