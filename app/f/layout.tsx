import type { ReactNode } from 'react'

export default function FormLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen py-8">
      {children}
    </div>
  )
}