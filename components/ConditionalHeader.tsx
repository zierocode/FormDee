'use client'
import { usePathname } from 'next/navigation'

export function ConditionalHeader() {
  const pathname = usePathname()
  
  // Hide header on form pages (routes starting with /f/) and home page
  if (pathname?.startsWith('/f/') || pathname === '/') {
    return null
  }

  return (
    <header className="border-b bg-white">
      <div className="container flex items-center justify-between py-4">
        <a href="/" className="text-lg font-semibold">FormDee - ฟอร์มดี</a>
        <button
          className="btn-secondary text-sm"
          onClick={() => {
            localStorage.removeItem('adminKey')
            setCookie('adminKey', '', -1)
            window.location.reload()
          }}
        >
          Change Admin Key
        </button>
      </div>
    </header>
  )
}

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === 'undefined') return
  const d = new Date()
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
  const expires = `expires=${d.toUTCString()}`
  document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
}