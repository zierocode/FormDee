'use client'

import { useEffect, useState } from 'react'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Layout from 'antd/es/layout'
import Typography from 'antd/es/typography'
import { useRouter } from 'next/navigation'
import { AdminKeyGate } from '@/components/AdminKeyGate'
import { BuilderForm } from '@/components/BuilderForm'
import { FormConfig } from '@/lib/types'

const { Title } = Typography
const { Content } = Layout

export const dynamic = 'force-dynamic'

async function getForm(refKey: string) {
  try {
    const res = await fetch(`/api/forms?refKey=${encodeURIComponent(refKey)}`, {
      cache: 'no-store',
    })
    const result = (await res.json()) as { ok: boolean; data?: FormConfig | FormConfig[] }

    // Handle the case where the API returns an array instead of a single object
    if (result.ok && result.data) {
      if (Array.isArray(result.data)) {
        // If data is an array, take the first item (should be the matching form)
        const formData = result.data.find((form) => form.refKey === refKey) || result.data[0]
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

function BackButton() {
  const router = useRouter()

  return (
    <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/builder')}>
      Back
    </Button>
  )
}

export default function EditFormPage({ params }: { params: { refKey: string } }) {
  const [formData, setFormData] = useState<{ ok: boolean; data?: FormConfig } | null>(null)

  useEffect(() => {
    getForm(params.refKey).then(setFormData)
  }, [params.refKey])

  if (!formData) {
    return (
      <AdminKeyGate>
        <Layout style={{ minHeight: '100vh' }}>
          <Content
            style={{
              padding: '24px',
              background: 'rgb(240, 242, 245)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div>Loading...</div>
          </Content>
        </Layout>
      </AdminKeyGate>
    )
  }

  return (
    <AdminKeyGate>
      <Layout style={{ minHeight: '100vh' }}>
        <Content
          style={{
            padding: '24px',
            background: 'rgb(240, 242, 245)',
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
            }}
          >
            {/* Main Container */}
            <Card styles={{ body: { padding: 0 } }} style={{ background: '#fff' }}>
              <div
                style={{
                  padding: '24px',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <BackButton />
                  <EditOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  <Title level={4} style={{ margin: 0 }}>
                    Edit Form
                  </Title>
                </div>
                <div id="save-form-button-container">
                  {/* Save Form button will be rendered here */}
                </div>
              </div>
              <div style={{ padding: '24px' }}>
                <BuilderForm
                  mode="edit"
                  refKeyHint={params.refKey}
                  initial={formData.ok ? formData.data : undefined}
                  saveButtonContainer="#save-form-button-container"
                />
              </div>
            </Card>
          </div>
        </Content>
      </Layout>
    </AdminKeyGate>
  )
}
