'use client'
import React from 'react'
import { LoadingOutlined, InboxOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Input,
  Button,
  Card,
  Typography,
  Space,
  Alert,
  Spin,
  Select,
  Radio,
  Checkbox,
  DatePicker,
  InputNumber,
  Upload,
  Result,
} from 'antd'
import dayjs from 'dayjs'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { useForm as useFormQuery } from '@/hooks/use-forms'
import { useSubmitResponse } from '@/hooks/use-responses'
import { FormField } from '@/lib/types'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const { Dragger } = Upload

export function FormRenderer({ refKey }: { refKey: string }) {
  // Use TanStack Query to fetch form data
  const { data: form, isLoading, isError } = useFormQuery(refKey)

  // Use TanStack Query mutation for form submission
  const submitMutation = useSubmitResponse()

  // Track submission success state
  const [isSubmitSuccess, setIsSubmitSuccess] = React.useState(false)

  // Create dynamic schema based on form fields
  const createValidationSchema = (fields: FormField[]) => {
    const schemaObj: Record<string, any> = {}

    fields.forEach((field) => {
      let fieldSchema: any

      switch (field.type) {
        case 'email':
          fieldSchema = z.string().email('Invalid email address')
          break
        case 'number':
          fieldSchema = z.number()
          if (field.min !== undefined) fieldSchema = fieldSchema.min(field.min)
          if (field.max !== undefined) fieldSchema = fieldSchema.max(field.max)
          break
        case 'date':
          fieldSchema = z.string()
          break
        case 'checkbox':
          if (field.options && field.options.length > 0) {
            fieldSchema = z.array(z.string()).optional()
          } else {
            fieldSchema = z.boolean().optional()
          }
          break
        case 'file':
          fieldSchema = z.any().optional()
          break
        default:
          fieldSchema = z.string()
          if (field.pattern) {
            fieldSchema = fieldSchema.regex(new RegExp(field.pattern), 'Invalid format')
          }
      }

      if (field.required && field.type !== 'checkbox') {
        fieldSchema = fieldSchema.min(1, `${field.label} is required`)
      }

      if (!field.required) {
        fieldSchema = fieldSchema.optional()
      }

      schemaObj[field.key] = fieldSchema
    })

    return z.object(schemaObj)
  }

  // Initialize react-hook-form
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: form ? zodResolver(createValidationSchema(form.fields)) : undefined,
    mode: 'onBlur',
  })

  // Initialize form with default values when form data loads
  React.useEffect(() => {
    if (form) {
      const initialValues: Record<string, any> = {}
      form.fields.forEach((f) => {
        initialValues[f.key] = f.type === 'checkbox' ? false : ''
      })
      reset(initialValues)
    }
  }, [form, reset])

  const onSubmit = async (values: any) => {
    if (!form) return

    try {
      // Process file uploads before submitting
      const processedValues = { ...values }

      // Upload any File objects to R2 storage
      for (const [key, value] of Object.entries(values)) {
        const field = form.fields.find((f) => f.key === key)
        if (!field || field.type !== 'file') continue

        // Extract File objects from Upload component format
        const uploadList = (value as any)?.fileList || value || []
        const files = uploadList.map((item: any) => item.originFileObj).filter(Boolean)

        if (files.length > 0) {
          // Uploading files for field
          const uploadedFiles: any[] = []

          for (const file of files) {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('fieldKey', key)
            formData.append('refKey', form.refKey)

            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error?.message || 'File upload failed')
            }

            const result = await response.json()
            // Store the public URL of the uploaded file
            uploadedFiles.push(result.data.url)
          }

          // For single file fields, store just the URL string
          // For multiple file fields, store array of URLs
          processedValues[key] = field.allowMultiple ? uploadedFiles : uploadedFiles[0]
        }
      }

      // Convert date values to strings
      Object.keys(processedValues).forEach((key) => {
        if (dayjs.isDayjs(processedValues[key])) {
          processedValues[key] = processedValues[key].format('YYYY-MM-DD')
        }
      })

      // Submit using TanStack Query mutation
      await submitMutation.mutateAsync({
        refKey: form.refKey,
        values: processedValues,
      })

      // Reset form and show success result
      reset()
      setIsSubmitSuccess(true)
    } catch (error: any) {
      console.error('Form submission error:', error)
    }
  }

  // Full page background container
  const containerStyle = {
    minHeight: '100vh',
    width: '100vw',
    background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'auto',
    padding: '0',
    margin: '0',
  }

  const backgroundPatternStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      radial-gradient(circle at 20% 80%, rgba(24, 144, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(24, 144, 255, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(24, 144, 255, 0.05) 0%, transparent 50%)
    `,
    pointerEvents: 'none' as const,
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={containerStyle}>
        <div style={backgroundPatternStyle} />
        <div
          style={{
            position: 'relative',
            maxWidth: 600,
            margin: '0 auto',
            padding: '40px 20px 24px',
          }}
        >
          <Card
            style={{
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              borderRadius: 8,
            }}
            styles={{
              body: {
                padding: '48px 24px',
              },
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Spin
                size="large"
                indicator={<LoadingOutlined style={{ fontSize: 32, color: '#1890ff' }} spin />}
              />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  Loading form...
                </Text>
              </div>
            </div>
          </Card>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Powered by FormDee - ฟอร์มดี
            </Text>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (isError || !form) {
    return (
      <div style={containerStyle}>
        <div style={backgroundPatternStyle} />
        <div
          style={{
            position: 'relative',
            maxWidth: 480,
            margin: '0 auto',
            padding: '40px 20px',
            display: 'flex',
            alignItems: 'center',
            minHeight: '100vh',
            justifyContent: 'center',
          }}
        >
          <Card
            style={{
              width: '100%',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              borderRadius: 8,
            }}
            styles={{
              body: {
                padding: '28px 32px 24px',
              },
            }}
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {/* Logo and branding */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/FormDee-logo.png"
                  alt="FormDee Logo"
                  width={72}
                  height={72}
                  style={{ marginBottom: 10, width: 72, height: 72 }}
                />
                <Title level={2} style={{ margin: '0 0 2px 0', fontSize: 26 }}>
                  FormDee
                </Title>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  ฟอร์มดี
                </Text>
              </div>

              {/* Form Not Found Message */}
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ margin: '0 0 6px 0', fontSize: 18 }}>
                  Form Not Found • ไม่พบฟอร์ม
                </Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                  The form you're looking for doesn't exist.
                </Text>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  ไม่พบฟอร์มที่คุณกำลังค้นหา
                </Text>
                <div style={{ marginTop: 10 }}>
                  <Text code style={{ fontSize: 14, padding: '6px 12px' }}>
                    Form Error
                  </Text>
                </div>
              </div>

              {/* Bilingual Info alert */}
              <Alert
                message={<span>What you can do • สิ่งที่คุณสามารถทำได้</span>}
                description={
                  <div>
                    <div>Check the URL for typos or contact the form administrator</div>
                    <div>ตรวจสอบ URL หรือติดต่อผู้ดูแลระบบ</div>
                  </div>
                }
                type="warning"
                showIcon
                style={{ textAlign: 'left' }}
              />
            </Space>
          </Card>
        </div>
      </div>
    )
  }

  // Show success result if submission was successful
  if (isSubmitSuccess) {
    return (
      <div style={containerStyle}>
        <div style={backgroundPatternStyle} />

        <div
          style={{
            position: 'relative',
            maxWidth: 600,
            margin: '0 auto',
            padding: '40px 20px 24px',
          }}
        >
          <Card
            style={{
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              borderRadius: 8,
              width: '100%',
            }}
            styles={{
              body: {
                padding: '48px 24px',
              },
            }}
          >
            <Result
              status="success"
              title="Successfully Submitted!"
              subTitle="Thanks! Your response has been recorded."
              extra={[
                <Button
                  type="primary"
                  key="submit-another"
                  size="large"
                  onClick={() => setIsSubmitSuccess(false)}
                >
                  Submit another response
                </Button>,
              ]}
            />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={backgroundPatternStyle} />

      <div
        style={{
          position: 'relative',
          maxWidth: 600,
          margin: '0 auto',
          padding: '40px 20px 24px',
        }}
      >
        <Card
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            borderRadius: 8,
          }}
          styles={{
            body: {
              padding: '24px',
            },
          }}
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <Title level={2} style={{ margin: '0 0 6px 0' }}>
                {form.title}
              </Title>
              {form.description && (
                <Paragraph type="secondary" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {form.description}
                </Paragraph>
              )}
            </div>

            {!Array.isArray(form.fields) || form.fields.length === 0 ? (
              <Alert
                message="No Fields Available"
                description="This form has no fields configured yet. Please contact the form administrator."
                type="warning"
                showIcon
              />
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                {form.fields.map((field) => (
                  <FormFieldRenderer
                    key={field.key}
                    field={field}
                    control={control}
                    error={errors[field.key]}
                  />
                ))}

                <div style={{ marginTop: 16 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    loading={submitMutation.isPending}
                    size="large"
                    style={{ height: 46 }}
                  >
                    {submitMutation.isPending ? 'Submitting...' : 'Submit'}
                  </Button>
                </div>

                {submitMutation.isError && (
                  <Alert
                    message={submitMutation.error?.message || 'Submission failed'}
                    type="error"
                    showIcon
                    closable
                    onClose={() => submitMutation.reset()}
                    style={{ marginTop: 12 }}
                  />
                )}
              </form>
            )}
          </Space>
        </Card>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Powered by FormDee - ฟอร์มดี
          </Text>
        </div>
      </div>
    </div>
  )
}

function FormFieldRenderer({
  field,
  control,
  error,
}: {
  field: FormField
  control: any
  error?: any
}) {
  const hasError = !!error
  const errorMessage = error?.message

  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: 'block',
          marginBottom: 4,
          fontWeight: 500,
          color: hasError ? '#ff4d4f' : undefined,
        }}
      >
        {field.label}
        {field.required ? ' *' : ''}
      </label>

      {field.helpText && (
        <div
          style={{
            fontSize: 12,
            color: '#666',
            marginBottom: 4,
          }}
        >
          {field.helpText}
        </div>
      )}

      <Controller
        name={field.key}
        control={control}
        render={({ field: controllerField }) => {
          const commonProps = {
            ...controllerField,
            status: hasError ? ('error' as const) : undefined,
            placeholder: field.placeholder,
          }

          switch (field.type) {
            case 'text':
              return <Input {...commonProps} />

            case 'textarea':
              return <TextArea {...commonProps} rows={4} />

            case 'email':
              return <Input {...commonProps} type="email" />

            case 'number':
              return (
                <InputNumber
                  {...controllerField}
                  min={field.min}
                  max={field.max}
                  placeholder={field.placeholder}
                  style={{ width: '100%' }}
                  status={hasError ? ('error' as const) : undefined}
                />
              )

            case 'date':
              return (
                <DatePicker
                  {...controllerField}
                  style={{ width: '100%' }}
                  placeholder={field.placeholder}
                  format="YYYY-MM-DD"
                  status={hasError ? ('error' as const) : undefined}
                  value={controllerField.value ? dayjs(controllerField.value) : null}
                  onChange={(date) =>
                    controllerField.onChange(date ? date.format('YYYY-MM-DD') : '')
                  }
                />
              )

            case 'select':
              return (
                <Select
                  {...controllerField}
                  size="large"
                  placeholder={field.placeholder || `Select ${field.label}`}
                  options={field.options?.map((opt) => ({ label: opt, value: opt }))}
                  status={hasError ? ('error' as const) : undefined}
                  style={{
                    width: '100%',
                    minHeight: 48,
                  }}
                  dropdownStyle={{
                    padding: 4,
                  }}
                />
              )

            case 'radio':
              return (
                <Radio.Group {...controllerField}>
                  <Space direction="vertical">
                    {field.options?.map((opt) => (
                      <Radio key={opt} value={opt}>
                        {opt}
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              )

            case 'checkbox':
              if (field.options && field.options.length > 0) {
                return (
                  <Checkbox.Group {...controllerField}>
                    <Space direction="vertical">
                      {field.options.map((opt) => (
                        <Checkbox key={opt} value={opt}>
                          {opt}
                        </Checkbox>
                      ))}
                    </Space>
                  </Checkbox.Group>
                )
              } else {
                return (
                  <Checkbox {...controllerField} checked={controllerField.value}>
                    {field.placeholder || 'Check this box'}
                  </Checkbox>
                )
              }

            case 'file':
              return (
                <Dragger
                  {...controllerField}
                  name="file"
                  multiple={field.allowMultiple}
                  beforeUpload={() => false}
                  accept={field.acceptedTypes?.join(',')}
                  fileList={controllerField.value?.fileList || []}
                  onChange={(info) => controllerField.onChange(info)}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Click or drag file to this area to upload</p>
                  <p className="ant-upload-hint">
                    {field.allowMultiple ? 'Support for multiple files' : 'Single file upload'}
                  </p>
                </Dragger>
              )

            default:
              return <Input {...commonProps} />
          }
        }}
      />

      {hasError && (
        <div
          style={{
            color: '#ff4d4f',
            fontSize: 14,
            marginTop: 4,
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  )
}
