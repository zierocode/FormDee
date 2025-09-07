'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface AsyncState<T> {
  data: T | null
  error: Error | null
  loading: boolean
}

/**
 * Hook to handle async operations with loading, error, and data states
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true
): {
  execute: () => Promise<void>
  data: T | null
  error: Error | null
  loading: boolean
  reset: () => void
} {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: false,
  })

  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const execute = useCallback(async () => {
    setState({ data: null, error: null, loading: true })

    try {
      const data = await asyncFunction()
      if (mountedRef.current) {
        setState({ data, error: null, loading: false })
      }
    } catch (error) {
      if (mountedRef.current) {
        setState({ data: null, error: error as Error, loading: false })
      }
    }
  }, [asyncFunction])

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false })
  }, [])

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])

  return { ...state, execute, reset }
}