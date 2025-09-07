"use client"
import { useState } from 'react'
import { BuilderForm } from '@/components/BuilderForm'

export function CreateFormSection() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Create New Form</h2>
            <p className="text-sm text-gray-600">Start a new form configuration.</p>
          </div>
          <button className="btn" onClick={() => setOpen(true)}>Create Form</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">New Form</h2>
        <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      <BuilderForm mode="create" />
    </div>
  )
}

