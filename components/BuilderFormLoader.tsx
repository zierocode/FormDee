'use client'
import { useEffect, useRef, useState } from 'react'
import { fetchFormPublic } from '@/lib/api'
import { FormConfig } from '@/lib/types'
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refKey])

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-10 w-full animate-pulse rounded-md bg-gray-100" />
            </div>
          ))}
          <div className="space-y-2 md:col-span-2">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-24 w-full animate-pulse rounded-md bg-gray-100" />
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
          <button className="btn-secondary" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  return <BuilderForm mode="edit" initial={data} refKeyHint={refKey} />
}
