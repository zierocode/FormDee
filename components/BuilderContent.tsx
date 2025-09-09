'use client'
import { useState, lazy, Suspense, useEffect } from 'react'
import {
  PlusOutlined,
  ThunderboltOutlined,
  ArrowLeftOutlined,
  FormOutlined,
} from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Layout from 'antd/es/layout'
import Space from 'antd/es/space'
import Typography from 'antd/es/typography'
import AIPromptModal from '@/components/AIPromptModal'
import { useAuth } from '@/components/AuthProvider'
import { FormSkeleton, ListSkeleton } from '@/components/ui/Skeleton'
import { useForms } from '@/hooks/use-forms'

const { Title, Text: _Text } = Typography
const { Header: _Header, Content, Footer: _Footer } = Layout

const BuilderForm = lazy(() =>
  import('@/components/BuilderForm').then((m) => ({ default: m.BuilderForm }))
)
const FormsList = lazy(() =>
  import('@/components/FormsList').then((m) => ({ default: m.FormsList }))
)

export function BuilderContent() {
  const { adminKey } = useAuth()
  const { data: _forms = [] } = useForms()
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
    const formTitle = aiGeneratedForm
      ? 'AI Generated Form'
      : duplicateFrom
        ? 'Duplicate Form'
        : 'New Form'

    return (
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
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => {
                      setCreatingForm(false)
                      setDuplicateFrom(null)
                      setAiGeneratedForm(null)
                    }}
                  >
                    Back
                  </Button>
                  <FormOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  <Title level={4} style={{ margin: 0 }}>
                    {formTitle}
                  </Title>
                </div>
                <div id="save-form-button-container">
                  {/* Save and Discard buttons will be rendered here */}
                </div>
              </div>
              <div style={{ padding: '24px' }}>
                <Suspense fallback={<FormSkeleton />}>
                  <BuilderForm
                    mode="create"
                    duplicateFrom={duplicateFrom || undefined}
                    aiGeneratedForm={aiGeneratedForm}
                    saveButtonContainer="#save-form-button-container"
                  />
                </Suspense>
              </div>
            </Card>
          </div>
        </Content>
      </Layout>
    )
  }

  return (
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
                <FormOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                <Title level={4} style={{ margin: 0 }}>
                  Form Builder
                </Title>
              </div>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreatingForm(true)}
                >
                  Create New
                </Button>
                <Button icon={<ThunderboltOutlined />} onClick={() => setShowAIModal(true)}>
                  AI Generate
                </Button>
              </Space>
            </div>
            <div style={{ padding: '24px' }}>
              <Suspense fallback={<ListSkeleton count={3} />}>
                <FormsList />
              </Suspense>
            </div>
          </Card>
        </div>
      </Content>

      <AIPromptModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onGenerate={handleAIGenerate}
        adminKey={adminKey}
      />
    </Layout>
  )
}
