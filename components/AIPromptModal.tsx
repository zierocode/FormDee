'use client'

import { useState } from 'react'
import { RobotOutlined, LoadingOutlined, BulbOutlined } from '@ant-design/icons'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import List from 'antd/es/list'
import Modal from 'antd/es/modal'
import Typography from 'antd/es/typography'

const { TextArea } = Input
const { Text } = Typography

interface AIPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (formData: any) => void
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
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ prompt: values.prompt }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to generate form'

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
      onGenerate(data)
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

  const tips = [
    'Be specific: "Contact form with name, email, phone, company, and message"',
    'Mention validation: "Email must be required, phone optional"',
    'Specify field types: "Include rating dropdown and file upload for documents"',
    'Add context: "Job application form for software developer position"',
    'Request options: "Survey with yes/no questions and rating scale 1-5"',
  ]

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RobotOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
          <span>Create Form with AI</span>
        </div>
      }
      open={isOpen}
      onCancel={handleCancel}
      footer={null}
      width={600}
      maskClosable={!loading}
      closable={!loading}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={loading}>
        <Form.Item
          name="prompt"
          label="Describe the form you want to create"
          rules={[
            { required: true, message: 'Please enter a prompt' },
            { min: 10, message: 'Please provide more details (at least 10 characters)' },
          ]}
        >
          <TextArea
            placeholder="e.g., Create a customer feedback form with name (required), email (required), satisfaction rating (1-5 scale), and detailed comments (optional). Include file upload for attachments."
            rows={5}
            showCount
            maxLength={800}
          />
        </Form.Item>

        {configError && (
          <Alert
            type="warning"
            message="AI Configuration Required"
            description={
              <div>
                <Text>{configError}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Please configure your AI settings in the Settings menu before using AI form
                  generation.
                </Text>
              </div>
            }
            style={{ marginBottom: '16px' }}
            showIcon
          />
        )}

        {error && !configError && (
          <Alert type="error" message={error} style={{ marginBottom: '16px' }} showIcon />
        )}

        <Alert
          type="info"
          message="🚀 Powered by AI - Tips for best results:"
          description={
            <List
              size="small"
              dataSource={tips}
              renderItem={(tip) => (
                <List.Item style={{ padding: '6px 0', border: 'none' }}>
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    • {tip}
                  </Text>
                </List.Item>
              )}
            />
          }
          icon={<BulbOutlined />}
          style={{ marginBottom: '24px' }}
        />

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={handleCancel} disabled={loading} style={{ marginRight: '8px' }}>
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={loading ? <LoadingOutlined /> : <RobotOutlined />}
            loading={loading}
          >
            {loading ? 'Generating...' : 'Generate Form'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
}
