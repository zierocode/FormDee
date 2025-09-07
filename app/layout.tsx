import './globals.css'
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { ConditionalHeader } from '@/components/ConditionalHeader'
import { ConditionalMain } from '@/components/ConditionalMain'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'FormDee - ฟอร์มดี',
  description: 'Build and share forms easily - สร้างและแชร์ฟอร์มได้ง่าย ๆ',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    other: [
      {
        rel: 'android-chrome-192x192',
        url: '/android-chrome-192x192.png',
      },
      {
        rel: 'android-chrome-512x512',
        url: '/android-chrome-512x512.png',
      },
    ],
  },
  manifest: '/site.webmanifest',
}

export const viewport = {
  themeColor: '#3b82f6',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Toaster position="top-center" />
        <ConditionalHeader />
        <ConditionalMain>{children}</ConditionalMain>
      </body>
    </html>
  )
}

