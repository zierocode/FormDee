'use client'
import React from 'react'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { Input, InputNumber, Select, DatePicker, Checkbox, Radio, Space } from 'antd'
import dayjs from 'dayjs'
import type { Control, FieldError, FieldValues, Path } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import type { FormField } from '@/lib/types'

const { TextArea } = Input

interface ValidatedFieldProps<TFieldValues extends FieldValues = FieldValues> {
  field: FormField
  control: Control<TFieldValues>
  error?: FieldError
  name: Path<TFieldValues>
}

export function ValidatedField<TFieldValues extends FieldValues = FieldValues>({
  field,
  control,
  error,
  name,
}: ValidatedFieldProps<TFieldValues>) {
  const [touched, setTouched] = React.useState(false)
  const hasError = !!error
  const errorMessage = error?.message

  // Determine validation state
  const getValidationStatus = (value: any): '' | 'error' | 'warning' | undefined => {
    if (!touched && !value) return undefined
    if (hasError) return 'error'
    // Remove 'success' status as it's not supported by Ant Design
    return undefined
  }

  // Get suffix icon for validation feedback
  const getSuffixIcon = (value: any) => {
    if (hasError) {
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    }
    if (touched && value && !hasError) {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />
    }
    return undefined
  }

  return (
    <div className="mb-4">
      <label
        className={`mb-1 block text-sm font-medium ${hasError ? 'text-red-500' : 'text-gray-700'}`}
        htmlFor={field.key}
      >
        {field.label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {field.helpText && <div className="mb-1 text-xs text-gray-500">{field.helpText}</div>}

      <Controller
        name={name}
        control={control}
        render={({ field: controllerField }) => {
          const status = getValidationStatus(controllerField.value)
          const suffix = getSuffixIcon(controllerField.value)

          const commonProps = {
            ...controllerField,
            id: field.key,
            status,
            placeholder: field.placeholder,
            onBlur: () => {
              setTouched(true)
              controllerField.onBlur()
            },
            className: 'w-full',
            style: {
              paddingRight: suffix ? '32px' : undefined,
            },
          }

          const inputWithIcon = (input: React.ReactElement) => (
            <div className="relative">
              {input}
              {suffix && (
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                  {suffix}
                </div>
              )}
            </div>
          )

          switch (field.type) {
            case 'text':
              return inputWithIcon(<Input {...commonProps} suffix={suffix} />)

            case 'textarea':
              return inputWithIcon(<TextArea {...commonProps} rows={4} />)

            case 'email':
              return inputWithIcon(<Input {...commonProps} type="email" suffix={suffix} />)

            case 'number':
              return (
                <InputNumber
                  {...controllerField}
                  id={field.key}
                  min={field.min}
                  max={field.max}
                  placeholder={field.placeholder}
                  className="w-full"
                  status={status}
                  onBlur={() => {
                    setTouched(true)
                    controllerField.onBlur()
                  }}
                />
              )

            case 'date':
              return (
                <DatePicker
                  {...controllerField}
                  id={field.key}
                  className="w-full"
                  placeholder={field.placeholder}
                  format="YYYY-MM-DD"
                  status={status}
                  value={controllerField.value ? dayjs(controllerField.value) : null}
                  onChange={(date) =>
                    controllerField.onChange(date ? date.format('YYYY-MM-DD') : '')
                  }
                  onBlur={() => {
                    setTouched(true)
                  }}
                />
              )

            case 'select':
              return (
                <Select
                  {...controllerField}
                  id={field.key}
                  placeholder={field.placeholder || `Select ${field.label}`}
                  options={field.options?.map((opt) => ({ label: opt, value: opt }))}
                  status={status}
                  className="w-full"
                  onBlur={() => {
                    setTouched(true)
                    controllerField.onBlur()
                  }}
                />
              )

            case 'radio':
              return (
                <Radio.Group {...controllerField} id={field.key}>
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
              }
              return (
                <Checkbox {...controllerField} id={field.key} checked={controllerField.value}>
                  {field.placeholder || 'Check this box'}
                </Checkbox>
              )

            default:
              return inputWithIcon(<Input {...commonProps} suffix={suffix} />)
          }
        }}
      />

      {hasError && (
        <div className="mt-1 flex items-center text-sm text-red-500">
          <CloseCircleOutlined className="mr-1" />
          {errorMessage}
        </div>
      )}
    </div>
  )
}
