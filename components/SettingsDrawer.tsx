'use client'

import { Drawer } from 'antd'
import { SettingsClient } from './SettingsClient'

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
  adminKey: string
  onLogout: () => void
}

export function SettingsDrawer({ open, onClose, adminKey, onLogout }: SettingsDrawerProps) {
  return (
    <Drawer
      title="Menu"
      placement="right"
      onClose={onClose}
      open={open}
      width={600}
      styles={{
        body: { padding: '24px' },
      }}
    >
      <SettingsClient inDrawer={true} onClose={onClose} adminKey={adminKey} onLogout={onLogout} />
    </Drawer>
  )
}
