'use client'

import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Typography } from 'antd'
import { useRouter } from 'next/navigation'

const { Title } = Typography

export function EditFormHeader() {
  const router = useRouter()

  return (
    <div
      style={{
        background: '#fff',
        padding: 0,
        height: 64,
        lineHeight: '64px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          height: '100%',
        }}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/builder')}>
          Back
        </Button>
        <Title level={3} style={{ margin: 0, lineHeight: '64px' }}>
          Edit Form
        </Title>
      </div>
    </div>
  )
}
