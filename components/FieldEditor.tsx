'use client'
import { memo, useEffect, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Switch from 'antd/es/switch'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { FormField, FieldType } from '@/lib/types'
import { fieldEditorSchema, type FieldEditorData } from '@/schemas/fieldSchema'

const { TextArea } = Input

type Props = {
  value?: FormField
  onSave: (_field: FormField) => void
  onCancel?: () => void
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File Upload' },
]

export const FieldEditor = memo(function FieldEditor({
  value,
  onSave,
  onCancel: _onCancel,
}: Props) {
  const form = useForm<FieldEditorData>({
    resolver: zodResolver(fieldEditorSchema),
    defaultValues: {
      key: value?.key ?? '',
      label: value?.label ?? '',
      type: value?.type ?? 'text',
      required: value?.required ?? false,
      placeholder: value?.placeholder ?? '',
      helpText: value?.helpText ?? '',
      options: value?.options?.join('\n') ?? '',
      min: value?.min?.toString() ?? '',
      max: value?.max?.toString() ?? '',
      pattern: value?.pattern ?? '',
      acceptedTypes:
        value?.acceptedTypes?.map((t) => (t.startsWith('.') ? t.substring(1) : t)).join(', ') ?? '',
      maxFileSize: value?.maxFileSize
        ? Math.round(value.maxFileSize / (1024 * 1024)).toString()
        : '',
      allowMultiple: value?.allowMultiple ?? false,
    },
    mode: 'onChange',
  })

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset: _reset,
    watch,
  } = form
  const watchedType = useWatch({ control, name: 'type' })
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  const needsOptions = ['select', 'radio', 'checkbox'].includes(watchedType)
  const isNumberField = watchedType === 'number'
  const isTextField = watchedType === 'text'
  const isFileField = watchedType === 'file'

  // Clear irrelevant fields when type changes
  useEffect(() => {
    const subscription = watch((_value, { name }) => {
      if (name === 'type') {
        // Clear type-specific fields
        if (!needsOptions) {
          form.setValue('options', '')
        }
        if (!isNumberField) {
          form.setValue('min', '')
          form.setValue('max', '')
        }
        if (!isTextField) {
          form.setValue('pattern', '')
        }
        if (!isFileField) {
          form.setValue('acceptedTypes', '')
          form.setValue('maxFileSize', '')
          form.setValue('allowMultiple', false)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, form, needsOptions, isNumberField, isTextField, isFileField])

  // Auto-save on valid changes with debouncing
  const lastValidDataRef = useRef<string>('')

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    if (!isValid) return

    saveTimeoutRef.current = setTimeout(() => {
      handleSubmit((data) => {
        const currentDataString = JSON.stringify(data)
        if (currentDataString !== lastValidDataRef.current) {
          const fieldToSave: FormField = {
            key: data.key.trim(),
            label: data.label.trim(),
            type: data.type,
            required: data.required ?? false,
            placeholder: data.placeholder || undefined,
            helpText: data.helpText || undefined,
            options: needsOptions
              ? Array.isArray(data.options)
                ? data.options
                : data.options
                    ?.split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean)
              : undefined,
            min:
              typeof data.min === 'string' ? (data.min ? Number(data.min) : undefined) : data.min,
            max:
              typeof data.max === 'string' ? (data.max ? Number(data.max) : undefined) : data.max,
            pattern: data.type === 'text' ? data.pattern || undefined : undefined,
            acceptedTypes:
              data.type === 'file'
                ? Array.isArray(data.acceptedTypes)
                  ? data.acceptedTypes
                  : data.acceptedTypes
                      ?.split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((s) => (s.startsWith('.') ? s : `.${s}`))
                : undefined,
            maxFileSize:
              data.type === 'file'
                ? typeof data.maxFileSize === 'string'
                  ? data.maxFileSize
                    ? Number(data.maxFileSize) * 1024 * 1024
                    : undefined
                  : data.maxFileSize
                : undefined,
            allowMultiple: data.type === 'file' ? data.allowMultiple : undefined,
          }

          onSave(fieldToSave)
          lastValidDataRef.current = currentDataString
        }
      })()
    }, 200)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [watch, isValid, handleSubmit, onSave, needsOptions])

  return (
    <div style={{ padding: '16px' }}>
      <Form layout="vertical">
        {/* First row: Type and Field Name */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Form.Item
                label="Type"
                required
                validateStatus={errors.type ? 'error' : ''}
                help={errors.type?.message}
              >
                <Select {...field} options={FIELD_TYPES} placeholder="Select field type" />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="key"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Field Name"
                required
                validateStatus={
                  fieldState.error
                    ? 'error'
                    : fieldState.isDirty && !fieldState.error
                      ? 'success'
                      : ''
                }
                help={fieldState.error?.message}
                hasFeedback
              >
                <Input {...field} placeholder="e.g. first_name" />
              </Form.Item>
            )}
          />
        </div>

        {/* Second row: Label and Placeholder */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Controller
            control={control}
            name="label"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Label"
                required
                validateStatus={
                  fieldState.error
                    ? 'error'
                    : fieldState.isDirty && !fieldState.error
                      ? 'success'
                      : ''
                }
                help={fieldState.error?.message}
                hasFeedback
              >
                <Input {...field} placeholder="e.g. First Name" />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="placeholder"
            render={({ field }) => (
              <Form.Item label="Placeholder">
                <Input {...field} placeholder="optional" />
              </Form.Item>
            )}
          />
        </div>

        {/* Help Text */}
        <Controller
          control={control}
          name="helpText"
          render={({ field }) => (
            <Form.Item label="Help Text">
              <Input {...field} placeholder="Shown under the field" />
            </Form.Item>
          )}
        />

        {/* Pattern field for text type */}
        {isTextField && (
          <Controller
            control={control}
            name="pattern"
            render={({ field }) => (
              <Form.Item label="Pattern (regex)">
                <Input {...field} placeholder="optional" />
              </Form.Item>
            )}
          />
        )}

        {/* Options field for select/radio/checkbox */}
        {needsOptions && (
          <Controller
            control={control}
            name="options"
            render={({ field }) => (
              <Form.Item
                label="Options"
                required
                validateStatus={errors.options ? 'error' : ''}
                help={errors.options?.message || 'One option per line'}
              >
                <TextArea
                  {...field}
                  rows={4}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                />
              </Form.Item>
            )}
          />
        )}

        {/* Min/Max fields for number type */}
        {isNumberField && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Controller
              control={control}
              name="min"
              render={({ field }) => (
                <Form.Item label="Min Value">
                  <Input {...field} type="number" placeholder="optional" />
                </Form.Item>
              )}
            />

            <Controller
              control={control}
              name="max"
              render={({ field }) => (
                <Form.Item label="Max Value">
                  <Input {...field} type="number" placeholder="optional" />
                </Form.Item>
              )}
            />
          </div>
        )}

        {/* File upload fields */}
        {isFileField && (
          <>
            <Controller
              control={control}
              name="acceptedTypes"
              render={({ field }) => (
                <Form.Item
                  label="Accepted File Types"
                  help="Comma-separated extensions (e.g., pdf, jpg, png)"
                >
                  <Input {...field} placeholder="pdf, jpg, png, doc" />
                </Form.Item>
              )}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Controller
                control={control}
                name="maxFileSize"
                render={({ field }) => (
                  <Form.Item label="Max File Size (MB)" help="Leave empty for no limit">
                    <Input {...field} type="number" placeholder="e.g., 5" min={1} />
                  </Form.Item>
                )}
              />

              <Controller
                control={control}
                name="allowMultiple"
                render={({ field: { value, onChange } }) => (
                  <Form.Item label="Allow Multiple Files">
                    <Switch checked={value} onChange={onChange} />
                  </Form.Item>
                )}
              />
            </div>
          </>
        )}
      </Form>
    </div>
  )
})
