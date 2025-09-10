'use client'
import { useEffect, useState } from 'react'
import {
  SaveOutlined,
  PlusOutlined,
  BarChartOutlined,
  CopyOutlined,
  ExportOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import notification from 'antd/es/notification'
import Popconfirm from 'antd/es/popconfirm'
import Space from 'antd/es/space'
import Spin from 'antd/es/spin'
import Switch from 'antd/es/switch'
import Typography from 'antd/es/typography'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useForm, Controller } from 'react-hook-form'
import { useForms, useUpsertForm } from '@/hooks/use-forms'
import { useResponseStats } from '@/hooks/use-responses'
import { FormConfig, FormField } from '@/lib/types'
import { formConfigSchema, type FormConfigData } from '@/lib/validation'
import { FieldEditor } from './FieldEditor'
import { FieldList } from './FieldList'

const { Title, Text: _Text } = Typography
const { TextArea } = Input

type Props = {
  initial?: FormConfig
  mode: 'create' | 'edit'
  refKeyHint?: string
  duplicateFrom?: string
  aiGeneratedForm?: any
  saveButtonContainer?: string
}

export function BuilderForm({
  initial,
  mode,
  refKeyHint,
  duplicateFrom,
  aiGeneratedForm,
  saveButtonContainer,
}: Props) {
  const [notificationApi, contextHolder] = notification.useNotification({
    placement: 'bottomRight',
    duration: 3,
  })
  const [fields, setFields] = useState<FormField[]>(initial?.fields ?? [])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [slackEnabled, setSlackEnabled] = useState(!!initial?.slackWebhookUrl)
  const [copySuccess, setCopySuccess] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(mode === 'edit')
  const [saveButtonPortalContainer, setSaveButtonPortalContainer] = useState<HTMLElement | null>(
    null
  )

  // TanStack Query hooks
  const { data: formsData } = useForms()
  const { data: responseStats } = useResponseStats(refKeyHint || initial?.refKey || '')
  const upsertFormMutation = useUpsertForm()

  // React Hook Form setup
  const form = useForm<FormConfigData>({
    resolver: zodResolver(formConfigSchema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      refKey: initial?.refKey ?? refKeyHint ?? '',
      slackWebhookUrl: initial?.slackWebhookUrl ?? '',
      fields: initial?.fields ?? [],
    },
    mode: 'onChange',
  })

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid: _isValid, isDirty },
  } = form

  // Watch form values
  const watchedValues = watch()

  // Find the save button container element
  useEffect(() => {
    if (saveButtonContainer) {
      const container = document.querySelector(saveButtonContainer) as HTMLElement
      setSaveButtonPortalContainer(container)
    } else {
      setSaveButtonPortalContainer(null)
    }
  }, [saveButtonContainer])

  // Header buttons component (Save and Discard)
  const HeaderButtons = () => (
    <Space>
      <Popconfirm
        title="Discard changes?"
        description="Are you sure you want to discard all unsaved changes?"
        icon={<QuestionCircleOutlined style={{ color: '#ff4d4f' }} />}
        okButtonProps={{ danger: true }}
        onConfirm={() => {
          // Reset form to initial values without redirecting
          if (initial) {
            form.reset({
              title: initial.title,
              description: initial.description || '',
              refKey: initial.refKey,
              slackWebhookUrl: initial.slackWebhookUrl || '',
              fields: initial.fields,
            })
            setFields(initial.fields)
            setSlackEnabled(!!initial.slackWebhookUrl)
          } else {
            form.reset({
              title: '',
              description: '',
              refKey: refKeyHint || '',
              slackWebhookUrl: '',
              fields: [],
            })
            setFields([])
            setSlackEnabled(false)
          }
          notificationApi.success({
            message: 'Success',
            description: 'Changes discarded successfully!',
          })
        }}
        okText="Yes, Discard"
        cancelText="Cancel"
        disabled={!isDirty}
      >
        <Button danger icon={<CloseOutlined />} disabled={!isDirty}>
          Discard Changes
        </Button>
      </Popconfirm>
      <Button
        type="primary"
        icon={<SaveOutlined />}
        loading={upsertFormMutation.isPending}
        disabled={!watchedValues.title?.trim() || !watchedValues.refKey?.trim()}
        onClick={async () => {
          // Get current form values
          const formValues = form.getValues()

          // Basic validation
          if (!formValues.title?.trim()) {
            notificationApi.error({
              message: 'Validation Error',
              description: 'Form title is required',
            })
            return
          }

          if (!formValues.refKey?.trim()) {
            notificationApi.error({
              message: 'Validation Error',
              description: 'Form URL is required',
            })
            return
          }

          // If no fields exist, still allow save (empty form is valid)
          if (fields.length === 0) {
            notificationApi.warning({
              message: 'No Fields',
              description: 'Form has no fields yet, but will be saved',
            })
          }

          // Create complete form data including fields
          const completeFormData: FormConfigData = {
            ...formValues,
            fields: fields,
          }

          // Call onSubmit with complete form data
          await onSubmit(completeFormData)
        }}
      >
        Save Form
      </Button>
    </Space>
  )

  // Initialize form data based on mode and props
  useEffect(() => {
    if (aiGeneratedForm) {
      form.reset({
        title: aiGeneratedForm.title || '',
        description: aiGeneratedForm.description || '',
        refKey: '',
        slackWebhookUrl: '',
        fields: aiGeneratedForm.fields || [],
      })
      setFields(aiGeneratedForm.fields || [])
      setLoadingInitial(false)
      return
    }

    if (duplicateFrom && formsData) {
      const sourceForm = formsData.find((f) => f.refKey === duplicateFrom)
      if (sourceForm) {
        form.reset({
          title: `${sourceForm.title} (Copy)`,
          description: sourceForm.description || '',
          refKey: '',
          slackWebhookUrl: sourceForm.slackWebhookUrl || '',
          fields: sourceForm.fields || [],
        })
        setFields(sourceForm.fields || [])
        setSlackEnabled(!!sourceForm.slackWebhookUrl)
      }
      setLoadingInitial(false)
      return
    }

    if (initial) {
      form.reset({
        title: initial.title,
        description: initial.description || '',
        refKey: initial.refKey,
        slackWebhookUrl: initial.slackWebhookUrl || '',
        fields: initial.fields,
      })
      setFields(initial.fields)
      setSlackEnabled(!!initial.slackWebhookUrl)
      setLoadingInitial(false) // Set loading to false after processing initial data
    } else if (mode === 'create') {
      setLoadingInitial(false)
    }
  }, [initial, aiGeneratedForm, duplicateFrom, formsData, form, mode])

  // Update form fields when fields array changes
  useEffect(() => {
    setValue('fields', fields, { shouldValidate: true, shouldDirty: true })
  }, [fields, setValue])

  // Handle Slack toggle
  const handleSlackToggle = (enabled: boolean) => {
    setSlackEnabled(enabled)
    if (!enabled) {
      setValue('slackWebhookUrl', '', { shouldValidate: true })
    }
  }

  // Field management functions
  const addField = (field: FormField) => {
    setFields((prev) => [...prev, field])
    setEditingIndex(fields.length)
  }

  const updateField = (index: number, field: FormField) => {
    setFields((prev) => prev.map((f, i) => (i === index ? field : f)))
  }

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index))
    if (editingIndex === index) {
      setEditingIndex(null)
    }
  }

  const reorderFields = (dragIndex: number, dropIndex: number) => {
    setFields((prev) => {
      const newFields = [...prev]
      const [draggedItem] = newFields.splice(dragIndex, 1)
      newFields.splice(dropIndex, 0, draggedItem)
      return newFields
    })
  }

  // Form submission
  const onSubmit = async (data: FormConfigData) => {
    // Check for duplicate refKey
    const refChanged = mode === 'edit' && initial?.refKey && data.refKey !== initial.refKey
    if ((mode === 'create' || refChanged) && data.refKey.trim()) {
      const exists = formsData?.some((f) => f.refKey === data.refKey)
      if (exists) {
        notificationApi.error({
          message: 'Duplicate URL',
          description: 'URL already exists. Choose another.',
        })
        return
      }
    }

    try {
      await upsertFormMutation.mutateAsync({
        ...data,
        prevRefKey: initial?.refKey,
      })
      notificationApi.success({
        message: 'Success',
        description: 'Form saved successfully!',
      })

      if (mode === 'create') {
        window.location.href = `/builder/${encodeURIComponent(data.refKey)}`
      }
    } catch (error: any) {
      notificationApi.error({
        message: 'Save Failed',
        description: error?.message || 'Failed to save form',
      })
    }
  }

  // Test Slack webhook
  const handleTestSlack = async () => {
    try {
      const response = await fetch('/api/forms/test-slack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          credentials: 'include',
        },
        body: JSON.stringify({
          refKey: watchedValues.refKey,
          slackWebhookUrl: watchedValues.slackWebhookUrl,
        }),
      })

      const data = await response.json()
      if (data.ok) {
        notificationApi.success({
          message: 'Success',
          description: 'Slack test message sent successfully!',
        })
      } else {
        notificationApi.error({
          message: 'Slack Test Failed',
          description: data.error || 'Test failed',
        })
      }
    } catch (error: any) {
      notificationApi.error({
        message: 'Slack Test Failed',
        description: error.message || 'Test failed',
      })
    }
  }

  // Copy form URL
  const copyFormUrl = async () => {
    const url = `${window.location.origin}/f/${encodeURIComponent(watchedValues.refKey || 'example')}`
    try {
      await navigator.clipboard.writeText(url)
      setCopySuccess(true)
      notificationApi.success({
        message: 'Success',
        description: 'Form URL copied to clipboard!',
      })
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      notificationApi.error({
        message: 'Copy Failed',
        description: 'Failed to copy URL',
      })
    }
  }

  // Delete form handler matching FormsList logic
  const [loadingDelete, setLoadingDelete] = useState(false)
  const router = useRouter()
  
  const handleDeleteClick = async () => {
    if (!initial?.refKey) return
    
    setLoadingDelete(true)
    try {
      const response = await fetch(`/api/forms?refKey=${encodeURIComponent(initial.refKey)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      const result = await response.json()

      if (result.ok) {
        notificationApi.success({
          message: 'Form Deleted',
          description: `Form "${initial.refKey}" deleted successfully`,
          placement: 'bottomRight',
        })
        // Navigate back to forms list
        router.push('/builder')
      } else {
        throw new Error(result.error?.message || 'Failed to delete form')
      }
    } catch (error: any) {
      notificationApi.error({
        message: 'Delete Failed',
        description: `Failed to delete form: ${error.message}`,
        placement: 'bottomRight',
      })
    } finally {
      setLoadingDelete(false)
    }
  }

  const formUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${encodeURIComponent(watchedValues.refKey || 'example')}`

  if (loadingInitial && mode === 'edit') {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading form...</div>
        </div>
      </Card>
    )
  }

  return (
    <>
      {contextHolder}
      {/* Render header buttons (Discard + Save) via portal */}
      {saveButtonPortalContainer && createPortal(<HeaderButtons />, saveButtonPortalContainer)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        {/* Main Form Area */}
        <div style={{ minWidth: 0 }}>
          <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
            <Card
              title="Form Details"
              style={{ marginBottom: 16 }}
              styles={{
                header: {
                  background: 'linear-gradient(135deg, #42a5f5 0%, #478ed1 100%)',
                  color: '#fff',
                },
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Form.Item
                      label="Title"
                      required
                      validateStatus={errors.title ? 'error' : ''}
                      help={errors.title?.message}
                    >
                      <Input {...field} placeholder="Enter form title" />
                    </Form.Item>
                  )}
                />

                <Controller
                  name="refKey"
                  control={control}
                  render={({ field }) => (
                    <Form.Item
                      label="URL"
                      required
                      validateStatus={errors.refKey ? 'error' : ''}
                      help={errors.refKey?.message}
                    >
                      <Input {...field} placeholder="e.g., contact-form, feedback" />
                    </Form.Item>
                  )}
                />
              </div>

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Form.Item label="Description">
                    <TextArea {...field} rows={3} placeholder="Optional form description" />
                  </Form.Item>
                )}
              />
            </Card>
          </Form>

          {/* Fields Section */}
          <Card
            styles={{
              header: {
                background: 'linear-gradient(135deg, #42a5f5 0%, #478ed1 100%)',
                color: '#fff',
              },
            }}
            title={
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Title level={4} style={{ margin: 0, color: '#fff' }}>
                  Form Fields
                </Title>
                {editingIndex === null && (
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => setEditingIndex(-1)}
                    style={{
                      backgroundColor: '#fff',
                      borderColor: '#d9d9d9',
                      color: '#000',
                    }}
                  >
                    Add Field
                  </Button>
                )}
              </div>
            }
          >
            <div style={{ minHeight: fields.length === 0 && editingIndex !== -1 ? '120px' : '0' }}>
              <FieldList
                fields={fields}
                onEdit={(i) => setEditingIndex(editingIndex === i ? null : i)}
                onRemove={removeField}
                onReorder={reorderFields}
                onRequiredChange={(idx, required) => {
                  const updatedField = { ...fields[idx], required }
                  updateField(idx, updatedField)
                }}
                editingIndex={editingIndex}
                isAnimatingUndo={false}
                editingFieldComponent={
                  editingIndex !== null && editingIndex >= 0 ? (
                    <FieldEditor
                      value={fields[editingIndex]}
                      onSave={(field) => updateField(editingIndex, field)}
                    />
                  ) : null
                }
              />
            </div>

            {editingIndex === -1 && (
              <Card style={{ marginTop: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Title level={5} style={{ margin: 0 }}>
                    Add New Field
                  </Title>
                  <Button type="text" onClick={() => setEditingIndex(null)} style={{ padding: 0 }}>
                    ✕
                  </Button>
                </div>
                <FieldEditor
                  value={undefined}
                  onSave={(field) => {
                    addField(field)
                    // Keep the field expanded for editing after adding
                  }}
                />
              </Card>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          {/* Slack Notifications Card */}
          <Card
            title={<span style={{ color: '#fff' }}>Slack Notifications</span>}
            size="small"
            styles={{
              header: {
                background: 'linear-gradient(135deg, #42a5f5 0%, #478ed1 100%)',
                color: '#fff',
              },
              body: {
                display: slackEnabled ? 'block' : 'none',
                padding: slackEnabled ? '12px' : 0,
              },
            }}
            extra={
              <Switch
                checked={slackEnabled}
                onChange={handleSlackToggle}
                checkedChildren="ON"
                unCheckedChildren="OFF"
                size="small"
                style={{
                  backgroundColor: slackEnabled ? '#52c41a' : undefined,
                }}
              />
            }
          >
            {slackEnabled && (
              <Controller
                name="slackWebhookUrl"
                control={control}
                render={({ field }) => (
                  <Form.Item
                    required
                    validateStatus={field.value?.trim() && errors.slackWebhookUrl ? 'error' : ''}
                    help={field.value?.trim() && errors.slackWebhookUrl?.message}
                    style={{ marginBottom: 0 }}
                  >
                    <Space.Compact style={{ display: 'flex', width: '100%' }}>
                      <Input
                        {...field}
                        placeholder="https://hooks.slack.com/services/..."
                        style={{ flex: 1 }}
                      />
                      <Button onClick={handleTestSlack} disabled={!field.value?.trim()}>
                        Test
                      </Button>
                    </Space.Compact>
                  </Form.Item>
                )}
              />
            )}
          </Card>

          {/* Form URL Card */}
          {watchedValues.refKey && (
            <Card
              title={<span style={{ color: '#fff' }}>Form URL and Tools</span>}
              size="small"
              style={{ marginTop: 16 }}
              styles={{
                header: {
                  background: 'linear-gradient(135deg, #42a5f5 0%, #478ed1 100%)',
                  color: '#fff',
                },
              }}
            >
              <Input.TextArea
                value={formUrl}
                readOnly
                autoSize
                style={{ fontSize: '12px', fontFamily: 'monospace', marginBottom: 12 }}
              />
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  block
                  icon={<CopyOutlined />}
                  onClick={copyFormUrl}
                  type={copySuccess ? 'dashed' : 'default'}
                >
                  {copySuccess ? 'Copied!' : 'Copy URL'}
                </Button>
                {mode === 'edit' && initial && (
                  <>
                    <Button
                      block
                      icon={<ExportOutlined />}
                      onClick={() => window.open(formUrl, '_blank')}
                    >
                      Open Form
                    </Button>
                    <Button
                      block
                      icon={<BarChartOutlined />}
                      onClick={() =>
                        (window.location.href = `/responses/${encodeURIComponent(watchedValues.refKey)}`)
                      }
                    >
                      View Response ({responseStats?.count || 0})
                    </Button>
                    <Popconfirm
                      title="Delete this form?"
                      description={
                        <div>
                          <p>This action will permanently delete:</p>
                          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                            <li>The form configuration</li>
                            <li>All form responses</li>
                            <li>All uploaded files from storage</li>
                          </ul>
                          <p style={{ color: '#ff4d4f', fontWeight: 'bold', margin: 0 }}>
                            This cannot be undone!
                          </p>
                        </div>
                      }
                      placement="topRight"
                      okText="Delete"
                      okType="danger"
                      cancelText="Cancel"
                      onConfirm={handleDeleteClick}
                    >
                      <Button
                        block
                        danger
                        icon={<DeleteOutlined />}
                        loading={loadingDelete}
                      >
                        Delete
                      </Button>
                    </Popconfirm>
                  </>
                )}
              </Space>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
