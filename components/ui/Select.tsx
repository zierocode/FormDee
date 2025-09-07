"use client"
import { useEffect, useRef, useState } from 'react'

export type Option = { value: string; label: string }

type Props = {
  options: Option[]
  value?: string | null
  placeholder?: string
  onChange: (val: string) => void
  className?: string
  disabled?: boolean
}

export function Select({ options, value, placeholder = 'Select…', onChange, className = '', disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const selected = options.find((o) => o.value === value) || null

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as any)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm ${disabled ? 'opacity-50' : 'hover:border-gray-400'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
      >
        <span className={selected ? '' : 'text-gray-500'}>{selected ? selected.label : placeholder}</span>
        <svg aria-hidden className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>
      {open && !disabled && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg">
          {options.length === 0 && (
            <div className="px-3 py-2 text-gray-500">No options</div>
          )}
          {options.map((o) => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`cursor-pointer px-3 py-2 hover:bg-gray-100 ${o.value === value ? 'bg-gray-50 font-medium' : ''}`}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

