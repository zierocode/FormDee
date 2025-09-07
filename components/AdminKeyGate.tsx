"use client"
import { ReactNode, useEffect, useState } from 'react'

export function AdminKeyGate({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const existing = localStorage.getItem('adminKey') || getCookie('adminKey')
    if (existing) {
      setKey(existing)
      // keep cookie in sync
      setCookie('adminKey', existing)
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = input.trim()
    if (v.length < 1) {
      setError('Please enter your admin key.')
      return
    }
    localStorage.setItem('adminKey', v)
    setCookie('adminKey', v)
    setKey(v)
    setError(null)
  }

  if (!key) {
    return (
      <div className="mx-auto max-w-md rounded-lg border p-6">
        <h2 className="mb-2 text-lg font-semibold">Admin Access Required</h2>
        <p className="mb-4 text-sm text-gray-600">Enter your admin key to access the builder.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="adminKey">Admin Key</label>
            <input id="adminKey" type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter admin key" className="w-full" />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <button className="btn w-full" type="submit">Continue</button>
        </form>
      </div>
    )
  }

  return <>{children}</>
}

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === 'undefined') return
  const d = new Date()
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
  const expires = `expires=${d.toUTCString()}`
  document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}
