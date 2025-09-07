"use client"
import { useEffect, useRef, useState } from 'react'
import { FormConfig } from '@/lib/types'
import { fetchFormPublic } from '@/lib/api'
import { BuilderForm } from './BuilderForm'

export function BuilderFormLoader({ refKey }: { refKey: string }) {
  const [data, setData] = useState<FormConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const controllerRef = useRef<AbortController | null>(null)
  const didFetchRef = useRef<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    // Abort any previous request
    if (controllerRef.current) controllerRef.current.abort()
    const ac = new AbortController()
    controllerRef.current = ac
    let res
    try {
      res = await fetchFormPublic(refKey, { signal: ac.signal })
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setError(e?.message || 'Failed to load form')
      setLoading(false)
      return
    }
    if (res.ok) {
      setData(res.data)
    } else {
      setError(res.error.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (didFetchRef.current === refKey) return
    didFetchRef.current = refKey
    load()
    return () => {
      if (controllerRef.current) controllerRef.current.abort()
    }
  }, [refKey])

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="h-6 w-40 rounded bg-gray-200 animate-pulse mb-4" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
              <div className="h-10 w-full rounded-md bg-gray-100 animate-pulse" />
            </div>
          ))}
          <div className="md:col-span-2 space-y-2">
            <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
            <div className="h-24 w-full rounded-md bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <div className="flex items-center justify-between">
          <span>{error}</span>
          <button className="btn-secondary" onClick={load}>Retry</button>
        </div>
      </div>
    )
  }

  if (!data) return null

  return <BuilderForm mode="edit" initial={data} refKeyHint={refKey} />
}
