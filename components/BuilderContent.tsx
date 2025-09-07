"use client"
import { useState, lazy, Suspense, useEffect } from 'react'
import { FormSkeleton, ListSkeleton } from '@/components/ui/Skeleton'

const BuilderForm = lazy(() => import('@/components/BuilderForm').then(m => ({ default: m.BuilderForm })))
const FormsList = lazy(() => import('@/components/FormsList').then(m => ({ default: m.FormsList })))

export function BuilderContent() {
  const [creatingForm, setCreatingForm] = useState(false)
  const [duplicateFrom, setDuplicateFrom] = useState<string | null>(null)

  // Check for duplicate parameter in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const duplicateParam = searchParams.get('duplicate')
    if (duplicateParam) {
      setDuplicateFrom(duplicateParam)
      setCreatingForm(true)
      // Clean URL without page reload
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  if (creatingForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a 
              href="/builder" 
              className="btn-secondary"
              onClick={(e) => {
                e.preventDefault()
                setCreatingForm(false)
                setDuplicateFrom(null)
              }}
            >
              ← Back
            </a>
            <h1 className="text-2xl font-semibold">{duplicateFrom ? 'Duplicate Form' : 'New Form'}</h1>
          </div>
        </div>
        <Suspense fallback={<FormSkeleton />}>
          <BuilderForm mode="create" duplicateFrom={duplicateFrom || undefined} />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Form Builder</h1>
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Create New Form</h2>
            <p className="text-sm text-gray-600">Start a new form configuration.</p>
          </div>
          <button className="btn" onClick={() => setCreatingForm(true)}>Create Form</button>
        </div>
      </div>
      <section className="mt-8">
        <Suspense fallback={<ListSkeleton count={3} />}>
          <FormsList />
        </Suspense>
      </section>
    </div>
  )
}