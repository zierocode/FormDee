import { FormRenderer } from '@/components/FormRenderer'

export const dynamic = 'force-dynamic'

async function getFormForMetadata(refKey: string) {
  try {
    // Use internal API route with proper base URL resolution
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/forms?refKey=${encodeURIComponent(refKey)}`, {
      cache: 'no-store'
    })
    
    if (response.ok) {
      const data = await response.json()
      return data
    }
  } catch (error) {
    console.error('Error fetching form for metadata:', error)
  }
  
  return { ok: false }
}

export async function generateMetadata({ params }: { params: Promise<{ refKey: string }> }) {
  const resolvedParams = await params
  try {
    const form = await getFormForMetadata(resolvedParams.refKey)
    if (form.ok && form.data) {
      const formTitle = form.data.title || 'Form'
      return {
        title: `${formTitle} powered by FormDee - ฟอร์มดี`,
        description: form.data.description || 'Fill out this form powered by FormDee - ฟอร์มดี'
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
  }
  
  // Fallback metadata
  return {
    title: 'Form powered by FormDee - ฟอร์มดี',
    description: 'Fill out this form powered by FormDee - ฟอร์มดี'
  }
}

export default async function PublicFormPage({ params }: { params: Promise<{ refKey: string }> }) {
  const resolvedParams = await params
  return <FormRenderer refKey={resolvedParams.refKey} />
}

