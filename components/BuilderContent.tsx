"use client"
import { useState, lazy, Suspense, useEffect } from 'react'
import { FormSkeleton, ListSkeleton } from '@/components/ui/Skeleton'
import AIPromptModal from '@/components/AIPromptModal'
import { useAuth } from '@/components/AuthProvider'

const BuilderForm = lazy(() => import('@/components/BuilderForm').then(m => ({ default: m.BuilderForm })))
const FormsList = lazy(() => import('@/components/FormsList').then(m => ({ default: m.FormsList })))

export function BuilderContent() {
  const { adminKey } = useAuth()
  const [creatingForm, setCreatingForm] = useState(false)
  const [duplicateFrom, setDuplicateFrom] = useState<string | null>(null)
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiGeneratedForm, setAiGeneratedForm] = useState<any>(null)

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

  const handleAIGenerate = (formData: any) => {
    setAiGeneratedForm(formData)
    setCreatingForm(true)
    setShowAIModal(false)
  }

  if (creatingForm) {
    const formTitle = aiGeneratedForm ? 'AI Generated Form' : (duplicateFrom ? 'Duplicate Form' : 'New Form')
    
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
                setAiGeneratedForm(null)
              }}
            >
              ← Back
            </a>
            <h1 className="text-2xl font-semibold">{formTitle}</h1>
          </div>
        </div>
        <Suspense fallback={<FormSkeleton />}>
          <BuilderForm 
            mode="create" 
            duplicateFrom={duplicateFrom || undefined}
            aiGeneratedForm={aiGeneratedForm}
          />
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
            <p className="text-sm text-gray-600">Start a new form configuration or generate with AI.</p>
          </div>
          <div className="flex gap-3">
            <button className="btn" onClick={() => setCreatingForm(true)}>Create Form</button>
            <button className="btn btn-primary" onClick={() => setShowAIModal(true)}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Create by AI
              </span>
            </button>
          </div>
        </div>
      </div>
      <section className="mt-8">
        <Suspense fallback={<ListSkeleton count={3} />}>
          <FormsList />
        </Suspense>
      </section>
      
      <AIPromptModal 
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onGenerate={handleAIGenerate}
        adminKey={adminKey}
      />
    </div>
  )
}