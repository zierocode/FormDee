'use client'

import { useEffect, useState } from 'react'
import { DEFAULTS } from '@/lib/constants'

/**
 * Hook to debounce a value
 */
export function useDebounce<T>(value: T, delay: number = DEFAULTS.DEBOUNCE_DELAY): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}