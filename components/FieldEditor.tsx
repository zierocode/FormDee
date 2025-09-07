"use client"
import { FormField, FieldType } from '@/lib/types'
import { useEffect, useState, memo } from 'react'
import { Select } from '@/components/ui/Select'

type Props = {
  value?: FormField
  onSave: (field: FormField) => void
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

export const FieldEditor = memo(function FieldEditor({ value, onSave, onCancel }: Props) {
  const [state, setState] = useState<FormField>(
    value ?? {
      key: '',
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      helpText: '',
      options: [],
    }
  )

  useEffect(() => {
    if (value) setState(value)
  }, [value])

  const needsOptions = state.type === 'select' || state.type === 'radio' || state.type === 'checkbox'

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    
    // Basic required fields validation
    if (!state.key?.trim() || !state.label?.trim()) {
      alert('Field Key and Label are required')
      return
    }
    
    // Validate field key format (should be valid for form submission)
    const keyPattern = /^[a-zA-Z][a-zA-Z0-9_]*$/
    if (!keyPattern.test(state.key.trim())) {
      alert('Field Key must start with a letter and contain only letters, numbers, and underscores')
      return
    }
    
    // Field type specific validations
    if (needsOptions) {
      // Select, Radio, Checkbox fields must have options
      if (!state.options || state.options.length === 0) {
        alert(`${state.type.charAt(0).toUpperCase() + state.type.slice(1)} fields must have at least one option`)
        return
      }
      
      // Check for empty options
      const hasEmptyOptions = state.options.some(option => !option.trim())
      if (hasEmptyOptions) {
        alert('All options must have values. Please remove empty options.')
        return
      }
      
      // Check for duplicate options
      const uniqueOptions = new Set(state.options.map(opt => opt.trim().toLowerCase()))
      if (uniqueOptions.size !== state.options.length) {
        alert('Options must be unique. Please remove duplicate options.')
        return
      }
    }
    
    // Number and Date field validations
    if (state.type === 'number' || state.type === 'date') {
      if (state.min !== undefined && state.max !== undefined && state.min >= state.max) {
        alert('Minimum value must be less than maximum value')
        return
      }
    }
    
    // File upload field validations
    if (state.type === 'file') {
      // Validate max file size if provided
      if (state.maxFileSize && (state.maxFileSize < 1024 * 1024 || state.maxFileSize > 100 * 1024 * 1024)) {
        alert('Max file size must be between 1MB and 100MB')
        return
      }
      
      // Validate accepted file types format if provided
      if (state.acceptedTypes && state.acceptedTypes.length > 0) {
        const invalidTypes = state.acceptedTypes.filter(type => {
          const cleanType = type.startsWith('.') ? type.substring(1) : type
          return !cleanType.match(/^[a-zA-Z0-9]+$/)
        })
        if (invalidTypes.length > 0) {
          alert('File types must contain only letters and numbers (e.g., pdf, jpg, docx)')
          return
        }
      }
    }
    
    onSave({
      ...state,
      key: state.key.trim(),
      label: state.label.trim(),
      options: needsOptions ? state.options : undefined,
      acceptedTypes: state.type === 'file' ? state.acceptedTypes : undefined,
      maxFileSize: state.type === 'file' ? state.maxFileSize : undefined,
      allowMultiple: state.type === 'file' ? state.allowMultiple : undefined,
    })
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="key">Field Key</label>
          <input id="key" className="w-full" required value={state.key} onChange={(e) => setState({ ...state, key: e.target.value })} placeholder="e.g. first_name" />
        </div>
        <div className="space-y-1">
          <label htmlFor="label">Label</label>
          <input id="label" className="w-full" required value={state.label} onChange={(e) => setState({ ...state, label: e.target.value })} placeholder="e.g. First Name" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="type">Type</label>
          <Select
            options={FIELD_TYPES}
            value={state.type}
            onChange={(v) => setState({ ...state, type: v as FieldType })}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="required">Required</label>
          <Select
            options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}
            value={state.required ? 'yes' : 'no'}
            onChange={(v) => setState({ ...state, required: v === 'yes' })}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="placeholder">Placeholder</label>
          <input id="placeholder" className="w-full" value={state.placeholder ?? ''} onChange={(e) => setState({ ...state, placeholder: e.target.value })} placeholder="optional" />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="help">Help Text</label>
        <input id="help" className="w-full" value={state.helpText ?? ''} onChange={(e) => setState({ ...state, helpText: e.target.value })} placeholder="Shown under the field" />
      </div>
      {(state.type === 'number' || state.type === 'date') && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="min">Min</label>
            <input id="min" className="w-full" type="number" value={state.min ?? ''} onChange={(e) => setState({ ...state, min: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div className="space-y-1">
            <label htmlFor="max">Max</label>
            <input id="max" className="w-full" type="number" value={state.max ?? ''} onChange={(e) => setState({ ...state, max: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
        </div>
      )}
      {state.type === 'text' && (
        <div className="space-y-1">
          <label htmlFor="pattern">Pattern (regex)</label>
          <input id="pattern" className="w-full" value={state.pattern ?? ''} onChange={(e) => setState({ ...state, pattern: e.target.value })} placeholder="optional" />
        </div>
      )}
      {needsOptions && (
        <div className="space-y-1">
          <label>Options *</label>
          <OptionsEditor value={state.options ?? []} onChange={(opts) => setState({ ...state, options: opts })} />
          <p className="text-xs text-gray-500">
            {state.type === 'select' && 'At least one option is required for dropdown fields'}
            {state.type === 'radio' && 'At least one option is required for radio button fields'}
            {state.type === 'checkbox' && 'At least one option is required for checkbox fields'}
          </p>
        </div>
      )}
      {state.type === 'file' && (
        <>
          <div className="space-y-1">
            <label htmlFor="acceptedTypes">Accepted File Types</label>
            <FileTypesEditor 
              value={state.acceptedTypes ?? []} 
              onChange={(types) => setState({ ...state, acceptedTypes: types })} 
            />
            <p className="text-xs text-gray-500">Leave empty to accept all common file types</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="maxFileSize">Max File Size (MB)</label>
              <input 
                id="maxFileSize" 
                className="w-full" 
                type="number" 
                min="1" 
                max="100" 
                value={state.maxFileSize ? Math.round(state.maxFileSize / (1024 * 1024)) : ''} 
                onChange={(e) => setState({ 
                  ...state, 
                  maxFileSize: e.target.value ? Number(e.target.value) * 1024 * 1024 : undefined 
                })} 
                placeholder="10"
              />
              <p className="text-xs text-gray-500">Maximum: 100MB</p>
            </div>
            <div className="space-y-1">
              <label htmlFor="allowMultiple">Allow Multiple Files</label>
              <Select
                options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}
                value={state.allowMultiple ? 'yes' : 'no'}
                onChange={(v) => setState({ ...state, allowMultiple: v === 'yes' })}
              />
            </div>
          </div>
        </>
      )}
      <div className="flex items-center gap-2">
        <button type="submit" className="btn">Save Field</button>
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
})

function OptionsEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join('\n'))
  useEffect(() => {
    onChange(
      text
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  return (
    <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="One option per line" className="w-full" />
  )
}

function FileTypesEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join(', '))
  
  useEffect(() => {
    setText(value.map(s => s.startsWith('.') ? s.substring(1) : s).join(', '))
  }, [value])
  
  useEffect(() => {
    const newValue = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.startsWith('.') ? s : `.${s}`)
    
    const currentValue = value.map(s => s.startsWith('.') ? s.substring(1) : s).join(', ')
    
    if (text !== currentValue) {
      onChange(newValue)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  
  return (
    <div className="space-y-2">
      <input 
        value={text} 
        onChange={(e) => setText(e.target.value)} 
        placeholder="e.g. pdf, jpg, png, docx" 
        className="w-full" 
      />
      <div className="text-xs text-gray-500">
        <p>Common types: <span className="font-mono">pdf, doc, docx, txt, jpg, jpeg, png, gif, zip</span></p>
        <p>Separate multiple types with commas. File extensions will be automatically prefixed with a dot.</p>
      </div>
    </div>
  )
}
