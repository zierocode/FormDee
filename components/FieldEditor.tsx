'use client'
import { memo, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Switch from 'antd/es/switch'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { FormField, FieldType } from '@/lib/types'
import {
  VALIDATION_RULES,
  getValidationRulesByCategory,
  getPatternForRule,
  type ValidationRuleType,
} from '@/lib/validation-rules'
import {
  fieldEditorSchema,
  type FieldEditorData,
  type FieldEditorParsedData,
} from '@/schemas/fieldSchema'

const { TextArea } = Input

type Props = {
  value?: FormField
  onSave: (_field: FormField) => void
  onCancel?: () => void
  existingFields?: FormField[]
  editingIndex?: number
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
  onSave: _onSave,
  onCancel: _onCancel,
  existingFields: _existingFields = [],
  editingIndex: _editingIndex,
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
      // Enhanced validation system
      validationRule: value?.validationRule ?? 'none',
      pattern: value?.pattern ?? '',
      customPattern: value?.customPattern ?? '',
      validationDomain: value?.validationDomain ?? '',
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
    handleSubmit: _handleSubmit,
    formState: { errors, isValid: _isValid },
    reset: _reset,
    watch,
  } = form
  const watchedType = useWatch({ control, name: 'type' })
  const watchValidationRule = useWatch({ control, name: 'validationRule' })

  const needsOptions = ['select', 'radio', 'checkbox'].includes(watchedType)
  const isNumberField = watchedType === 'number'
  const isTextField = watchedType === 'text'
  const isFileField = watchedType === 'file'

  // Transform FieldEditorData to FormField format with validation processing
  const transformToFormField = (data: FieldEditorParsedData): FormField => {
    // Generate the pattern based on the validation rule
    const generatedPattern = getPatternForRule(
      data.validationRule as ValidationRuleType,
      data.customPattern,
      data.validationDomain
    )

    return {
      key: data.key,
      label: data.label,
      type: data.type,
      required: data.required ?? false,
      placeholder: data.placeholder,
      helpText: data.helpText,
      options: data.options && data.options.length > 0 ? data.options : undefined,
      min: typeof data.min === 'number' ? data.min : undefined,
      max: typeof data.max === 'number' ? data.max : undefined,
      // Enhanced validation system
      validationRule: data.validationRule || 'none',
      pattern: generatedPattern, // Generated from validation rule
      customPattern: data.customPattern,
      validationDomain: data.validationDomain,
      acceptedTypes:
        data.acceptedTypes && data.acceptedTypes.length > 0 ? data.acceptedTypes : undefined,
      maxFileSize: typeof data.maxFileSize === 'number' ? data.maxFileSize : undefined,
      allowMultiple: data.allowMultiple,
    }
  }

  // Auto-save field changes when form data changes (debounced)
  useEffect(() => {
    const subscription = watch((formData) => {
      // Debounce auto-save to avoid excessive calls
      const timeoutId = setTimeout(() => {
        try {
          // Only save if form is valid
          const validatedData = fieldEditorSchema.parse(formData)
          const transformedField = transformToFormField(validatedData)

          // Only save if field has actually changed
          if (JSON.stringify(transformedField) !== JSON.stringify(value)) {
            _onSave(transformedField)
          }
        } catch (error) {
          // Don't save if validation fails
          // Validation error during auto-save - field will not be saved
        }
      }, 300) // 300ms debounce

      return () => clearTimeout(timeoutId)
    })
    return () => subscription.unsubscribe()
  }, [watch, _onSave, value])

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

        {/* Enhanced Validation System for text type */}
        {isTextField && (
          <>
            <Controller
              control={control}
              name="validationRule"
              render={({ field }) => {
                const categories = getValidationRulesByCategory()
                const currentRule = field.value as ValidationRuleType

                return (
                  <Form.Item label="Input Validation" help="Choose how to validate user input">
                    <Select
                      {...field}
                      placeholder="Select validation rule"
                      style={{ width: '100%' }}
                    >
                      <Select.OptGroup label="Text Validation">
                        {categories.text.map((rule) => (
                          <Select.Option key={rule.type} value={rule.type}>
                            {rule.label}
                            {rule.example && (
                              <span style={{ color: '#666' }}> - {rule.example}</span>
                            )}
                          </Select.Option>
                        ))}
                      </Select.OptGroup>

                      <Select.OptGroup label="Contact Information">
                        {categories.contact.map((rule) => (
                          <Select.Option key={rule.type} value={rule.type}>
                            {rule.label}
                            {rule.example && (
                              <span style={{ color: '#666' }}> - {rule.example}</span>
                            )}
                          </Select.Option>
                        ))}
                      </Select.OptGroup>

                      <Select.OptGroup label="Numeric">
                        {categories.numeric.map((rule) => (
                          <Select.Option key={rule.type} value={rule.type}>
                            {rule.label}
                            {rule.example && (
                              <span style={{ color: '#666' }}> - {rule.example}</span>
                            )}
                          </Select.Option>
                        ))}
                      </Select.OptGroup>

                      <Select.OptGroup label="Web & URLs">
                        {categories.web.map((rule) => (
                          <Select.Option key={rule.type} value={rule.type}>
                            {rule.label}
                            {rule.example && (
                              <span style={{ color: '#666' }}> - {rule.example}</span>
                            )}
                          </Select.Option>
                        ))}
                      </Select.OptGroup>

                      <Select.OptGroup label="Advanced">
                        {categories.custom.map((rule) => (
                          <Select.Option key={rule.type} value={rule.type}>
                            {rule.label}
                          </Select.Option>
                        ))}
                      </Select.OptGroup>
                    </Select>

                    {currentRule && currentRule !== 'none' && VALIDATION_RULES[currentRule] && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: 8,
                          background: '#f8f9fa',
                          borderRadius: 4,
                          fontSize: 12,
                          color: '#666',
                        }}
                      >
                        <strong>Rule:</strong> {VALIDATION_RULES[currentRule].description}
                        {VALIDATION_RULES[currentRule].example && (
                          <>
                            <br />
                            <strong>Example:</strong> {VALIDATION_RULES[currentRule].example}
                          </>
                        )}
                      </div>
                    )}
                  </Form.Item>
                )
              }}
            />

            {/* Email domain field for email domain restriction */}
            {watchValidationRule === 'email_domain' && (
              <Controller
                control={control}
                name="validationDomain"
                render={({ field }) => (
                  <Form.Item
                    label="Allowed Domain"
                    help="Enter the domain name (e.g., company.com)"
                    required
                  >
                    <Input {...field} placeholder="company.com" />
                  </Form.Item>
                )}
              />
            )}

            {/* Custom regex field for custom validation */}
            {watchValidationRule === 'custom_regex' && (
              <Controller
                control={control}
                name="customPattern"
                render={({ field }) => (
                  <Form.Item
                    label="Custom Pattern (Regex)"
                    help="Enter a regular expression pattern"
                    required
                  >
                    <Input {...field} placeholder="^[A-Z][a-z]+$" />
                  </Form.Item>
                )}
              />
            )}
          </>
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
