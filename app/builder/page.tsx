import { AdminKeyGate } from '@/components/AdminKeyGate'
import { BuilderContent } from '@/components/BuilderContent'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Builder - FormDee - ฟอร์มดี',
  description: 'Build and manage forms with FormDee - สร้างและจัดการฟอร์มด้วย FormDee - ฟอร์มดี'
}

export default async function BuilderPage() {
  return (
    <AdminKeyGate>
      <BuilderContent />
    </AdminKeyGate>
  )
}
