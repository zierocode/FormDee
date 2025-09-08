import { AdminKeyGate } from '@/components/AdminKeyGate'
import { SettingsClient } from '@/components/SettingsClient'

export const metadata = {
  title: 'Settings - FormDee - ฟอร์มดี',
  description: 'Configure AI settings for FormDee - กำหนดค่า AI สำหรับ FormDee - ฟอร์มดี'
}

export default function SettingsPage() {
  return (
    <AdminKeyGate>
      <SettingsClient />
    </AdminKeyGate>
  )
}