'use client'

import { useEffect } from 'react'
import { SaveOutlined, ExperimentOutlined, LogoutOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Select, Input, Typography, Space, Spin, notification } from 'antd'
import { useForm, Controller } from 'react-hook-form'
import { useSettings, useUpdateSettings, useTestSettings } from '@/hooks/use-settings'
import { settingsSchema, type SettingsData } from '@/schemas/authSchema'
import { useAuth } from './AuthProvider'
import { StorageInfo } from './StorageInfo'

const { TextArea } = Input
const { Title, Text, Paragraph } = Typography

interface SettingsClientProps {
  inDrawer?: boolean
  onClose?: () => void
  adminKey?: string
  onLogout?: () => void
}

export function SettingsClient({
  inDrawer = false,
  onClose,
  adminKey: propAdminKey,
  onLogout,
}: SettingsClientProps) {
  // Use prop adminKey if provided (for drawer mode), otherwise use context
  let contextAdminKey = ''
  try {
    const auth = useAuth()
    contextAdminKey = auth.adminKey
  } catch (error) {
    // useAuth will throw if not in AuthProvider, which is fine for drawer mode
  }
  const adminKey = propAdminKey || contextAdminKey

  const [api, contextHolder] = notification.useNotification()

  const form = useForm<SettingsData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      aiModel: 'gpt-5-mini',
      apiKey: '',
    },
  })

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isValid },
  } = form
  const watchedApiKey = watch('apiKey')

  // Use TanStack Query to fetch settings
  const { data: settings, isLoading, error } = useSettings(adminKey)

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      reset({
        aiModel: settings.aiModel || 'gpt-5-mini',
        apiKey: settings.apiKey || '',
      })
    } else if (!isLoading && !error) {
      // If no settings exist yet, use defaults
      reset({
        aiModel: 'gpt-5-mini',
        apiKey: '',
      })
    }
  }, [settings, reset, isLoading, error])

  // Mutation for saving settings
  const saveMutation = useUpdateSettings(
    adminKey,
    () => {
      api.success({
        message: 'Settings Saved',
        description: 'Your configuration has been saved successfully.',
        placement: 'bottomRight',
        duration: 3,
      })

      // Auto-close drawer after successful save (only in drawer mode)
      if (inDrawer && onClose) {
        // Add a small delay to let user see the success message
        setTimeout(() => {
          onClose()
        }, 1500) // Close after 1.5 seconds
      }
    },
    (error: Error) => {
      api.error({
        message: 'Save Failed',
        description: error.message,
        placement: 'bottomRight',
        duration: 4,
      })
    }
  )

  // Mutation for testing configuration
  const testMutation = useTestSettings(
    adminKey,
    () => {
      api.success({
        message: 'Configuration Valid',
        description: 'Your API key has been verified successfully.',
        placement: 'bottomRight',
        duration: 3,
      })
    },
    (error: Error) => {
      api.error({
        message: 'Test Failed',
        description: error.message,
        placement: 'bottomRight',
        duration: 4,
      })
    }
  )

  const aiModels = [
    { value: 'gpt-5-mini', label: 'GPT-5 mini' },
    { value: 'gpt-5-nano', label: 'GPT-5 nano' },
    { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
  ]

  const handleSave = handleSubmit(async (data: SettingsData) => {
    // Test configuration first
    await testMutation.mutateAsync({
      aiModel: data.aiModel || 'gpt-5-mini',
      apiKey: data.apiKey,
    })

    // If test passes, save the settings
    await saveMutation.mutateAsync({
      aiModel: data.aiModel || 'gpt-5-mini',
      apiKey: data.apiKey,
    })
  })

  const handleTest = handleSubmit(async (data: SettingsData) => {
    await testMutation.mutateAsync({
      aiModel: data.aiModel || 'gpt-5-mini',
      apiKey: data.apiKey,
    })
  })

  // Handle loading state
  if (!adminKey || adminKey.trim() === '') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: 16 }}>Waiting for authentication...</Paragraph>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: 16 }}>Loading settings from database...</Paragraph>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Text type="danger">Error loading settings: {(error as Error).message}</Text>
      </div>
    )
  }

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Form Fields */}
        <div>
          <Title level={5} style={{ marginBottom: 8 }}>
            Model *
          </Title>
          <Controller
            control={control}
            name="aiModel"
            render={({ field }) => (
              <Select
                {...field}
                style={{ width: '100%' }}
                size="large"
                options={aiModels}
                placeholder="Select model"
              />
            )}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Select the model for intelligent form generation
          </Text>
        </div>

        <div>
          <Title level={5} style={{ marginBottom: 8 }}>
            API Key *
          </Title>
          <Controller
            control={control}
            name="apiKey"
            render={({ field, fieldState }) => (
              <TextArea
                {...field}
                placeholder="Enter your API key..."
                rows={3}
                size="large"
                status={fieldState.error ? 'error' : undefined}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
            )}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Your API key for AI-powered features
          </Text>
        </div>

        {/* Action Buttons */}
        <Space size="middle" style={{ width: '100%' }}>
          <Button
            onClick={handleSave}
            disabled={
              saveMutation.isPending || testMutation.isPending || !isValid || !watchedApiKey
            }
            type="primary"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            size="large"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button
            onClick={handleTest}
            disabled={
              saveMutation.isPending || testMutation.isPending || !isValid || !watchedApiKey
            }
            icon={<ExperimentOutlined />}
            loading={testMutation.isPending}
            size="large"
          >
            {testMutation.isPending ? 'Testing...' : 'Test Configuration'}
          </Button>
        </Space>

        {/* Storage Info section - only show in drawer mode */}
        {inDrawer && <StorageInfo />}

        {/* Logout section - only show in drawer mode */}
        {inDrawer && onLogout && (
          <Button
            type="default"
            danger
            icon={<LogoutOutlined />}
            onClick={onLogout}
            size="large"
            block
          >
            Logout
          </Button>
        )}
      </Space>
    </>
  )
}
