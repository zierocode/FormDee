import './globals.css'
import type { ReactNode } from 'react'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ConfigProvider } from 'antd'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { ConditionalHeader } from '@/components/ConditionalHeader'
import { ConditionalMain } from '@/components/ConditionalMain'
import { QueryProvider } from '@/components/QueryProvider'

const sarabun = localFont({
  src: [
    {
      path: '../public/fonts/sarabun-300.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/fonts/sarabun-400.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/sarabun-500.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/sarabun-600.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/sarabun-700.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-sarabun',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
})

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
  themeColor: '#1890ff',
}

// Ant Design theme configuration
const theme = {
  token: {
    fontFamily:
      'var(--font-sarabun), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={sarabun.variable}>
      <body className={sarabun.className}>
        <QueryProvider>
          <AntdRegistry>
            <ConfigProvider theme={theme}>
              <ConditionalHeader />
              <ConditionalMain>{children}</ConditionalMain>
            </ConfigProvider>
          </AntdRegistry>
        </QueryProvider>
      </body>
    </html>
  )
}
