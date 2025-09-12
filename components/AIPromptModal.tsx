'use client'

import { useState } from 'react'
import { RobotOutlined, LoadingOutlined } from '@ant-design/icons'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Modal from 'antd/es/modal'
import Typography from 'antd/es/typography'

const { TextArea } = Input
const { Text, Title } = Typography

interface AIPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (_formData: any) => void
  adminKey?: string
}

export default function AIPromptModal({ isOpen, onClose, onGenerate }: AIPromptModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [configError, setConfigError] = useState('')

  const handleSubmit = async (values: { prompt: string }) => {
    if (!values.prompt?.trim()) {
      setError('Please enter a prompt')
      return
    }

    setLoading(true)
    setError('')
    setConfigError('')

    try {
      const response = await fetch('/api/ui/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ prompt: values.prompt }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle both string error messages and nested error objects
        const errorMessage =
          typeof data.error === 'string'
            ? data.error
            : data.error?.message || data.message || 'Failed to generate form'

        // Check if it's a configuration error
        if (
          errorMessage.includes('AI configuration') ||
          errorMessage.includes('API key') ||
          errorMessage.includes('settings')
        ) {
          setConfigError(errorMessage)
        } else {
          setError(errorMessage)
        }
        return
      }

      // Pass the generated form data to parent
      onGenerate(data.data)
      form.resetFields()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to generate form')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setError('')
    setConfigError('')
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onCancel={handleCancel}
      footer={null}
      width={500}
      maskClosable={!loading}
      closable={false}
      centered
      styles={{
        body: { padding: '24px' },
        header: { display: 'none' },
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            marginBottom: '12px',
          }}
        >
          <RobotOutlined style={{ color: 'white', fontSize: '28px' }} />
        </div>
        <Title level={3} style={{ margin: 0, color: '#1f2937', fontSize: '20px' }}>
          Create Form with AI
        </Title>
        <Text type="secondary" style={{ fontSize: '13px' }}>
          Describe your form and let AI build it for you
        </Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={loading}>
        <Form.Item
          name="prompt"
          rules={[
            { required: true, message: 'Please describe your form' },
            { min: 10, message: 'Please provide more details (at least 10 characters)' },
          ]}
        >
          <TextArea
            placeholder="e.g., Contact form with name, email, and message fields"
            rows={3}
            showCount
            maxLength={300}
            style={{
              fontSize: '15px',
              lineHeight: '1.5',
              border: '2px solid #f0f0f0',
              borderRadius: '8px',
              padding: '10px 14px',
            }}
          />
        </Form.Item>

        {configError && (
          <Alert
            type="warning"
            message="Setup Required"
            description={configError}
            style={{ marginBottom: '20px', borderRadius: '8px' }}
            showIcon
          />
        )}

        {error && !configError && (
          <Alert
            type="error"
            message={error}
            style={{ marginBottom: '20px', borderRadius: '8px' }}
            showIcon
          />
        )}

        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginTop: '20px',
          }}
        >
          <Button
            onClick={handleCancel}
            disabled={loading}
            size="large"
            style={{
              flex: 1,
              height: '44px',
              borderRadius: '6px',
              fontWeight: '500',
            }}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={loading ? <LoadingOutlined /> : <RobotOutlined />}
            loading={loading}
            size="large"
            style={{
              flex: 2,
              height: '44px',
              borderRadius: '6px',
              fontWeight: '500',
              background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
              border: 'none',
            }}
          >
            {loading ? 'Creating...' : 'Generate Form'}
          </Button>
        </div>

        {!configError && !error && (
          <div
            style={{
              textAlign: 'center',
              marginTop: '16px',
              padding: '8px 12px',
              background: '#f8fafc',
              borderRadius: '6px',
            }}
          >
            <Text type="secondary" style={{ fontSize: '12px' }}>
              💡 Be specific about field types and validation rules for best results
            </Text>
          </div>
        )}
      </Form>
    </Modal>
  )
}
