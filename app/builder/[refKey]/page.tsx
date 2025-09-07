import { AdminKeyGate } from '@/components/AdminKeyGate'
import { BuilderForm } from '@/components/BuilderForm'
import { FormConfig } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ refKey: string }> }) {
  const resolvedParams = await params
  return {
    title: `Edit ${resolvedParams.refKey} - FormDee - ฟอร์มดี`,
    description: 'Build and manage forms with FormDee - สร้างและจัดการฟอร์มด้วย FormDee - ฟอร์มดี'
  }
}

async function getForm(refKey: string) {
  // Updated to handle array responses correctly - fix port to match current server
  const base = process.env.NEXT_PUBLIC_BASE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3002')
  try {
    const res = await fetch(`${base}/api/forms?refKey=${encodeURIComponent(refKey)}`, { cache: 'no-store' })
    const result = (await res.json()) as { ok: boolean; data?: FormConfig | FormConfig[] }
    
    // Handle the case where the API returns an array instead of a single object
    if (result.ok && result.data) {
      if (Array.isArray(result.data)) {
        // If data is an array, take the first item (should be the matching form)
        const formData = result.data.find(form => form.refKey === refKey) || result.data[0]
        return { ok: true, data: formData }
      }
      // If data is already a single object, return as is
      return { ok: true, data: result.data }
    }
    
    return { ok: false }
  } catch {
    return { ok: false } as any
  }
}

export default async function EditFormPage({ params }: { params: Promise<{ refKey: string }> }) {
  const resolvedParams = await params
  const data = await getForm(resolvedParams.refKey)
  return (
    <AdminKeyGate>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/builder" className="btn-secondary">← Back</a>
            <h1 className="text-2xl font-semibold">Edit Form</h1>
          </div>
        </div>
        <BuilderForm mode="edit" refKeyHint={resolvedParams.refKey} initial={data.ok ? data.data : undefined} />
      </div>
    </AdminKeyGate>
  )
}
