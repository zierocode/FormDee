"use client"
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { FormConfig, FormField } from '@/lib/types'
import { fetchFormPublic, submitForm } from '@/lib/api'
import { Select } from '@/components/ui/Select'
import { SuccessModal } from '@/components/SuccessModal'

export function FormRenderer({ refKey }: { refKey: string }) {
  const [form, setForm] = useState<FormConfig | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    let mounted = true
    const controller = new AbortController()
    async function load(attempt = 0) {
      if (!mounted) return
      setStatus('loading')
      try {
        const res = await fetchFormPublic(refKey, { cache: 'no-store', signal: controller.signal as any })
        if (!mounted) return
        if (res.ok) {
          // Handle both single object and array responses
          const rawData = (res as any)?.data
          const base: any = Array.isArray(rawData) ? rawData[0] || {} : rawData || {}
          // Accept fields as array or JSON string
          let fields: any = base?.fields
          if (typeof fields === 'string') {
            try { fields = JSON.parse(fields) } catch {}
          }
          const safe: FormConfig = {
            ...base,
            fields: Array.isArray(fields) ? fields : [],
          }
          setForm(safe)
          const init: Record<string, any> = {}
          safe.fields.forEach((f) => (init[f.key] = f.type === 'checkbox' ? false : ''))
          setValues(init)
          // If fields are empty, retry once or twice to avoid transient empties
          if (safe.fields.length === 0 && attempt < 2) {
            setTimeout(() => load(attempt + 1), 500 * (attempt + 1))
          } else {
            setStatus('idle')
          }
        } else {
          setMessage(res.error.message)
          setStatus('error')
        }
      } catch (e: any) {
        if (!mounted) return
        setMessage(e?.message || 'Failed to load form.')
        setStatus('error')
      }
    }
    load(0)
    return () => {
      mounted = false
      try { controller.abort() } catch {}
    }
  }, [refKey])

  function handleChange(field: FormField, val: any) {
    setValues((prev) => ({ ...prev, [field.key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setStatus('loading')
    setMessage(null)
    
    try {
      // Process file uploads before submitting
      const processedValues = { ...values }
      
      // Get upload folder URL
      const uploadFolderUrl = form.uploadFolderUrl || 
        (form.refKey === 'example' ? 'https://drive.google.com/drive/folders/1AVxql8LNn3Ymv5VkPCSg3AVjI3dHkQrU' : null)
      
      // Upload any File objects
      for (const [key, value] of Object.entries(values)) {
        const field = form.fields.find(f => f.key === key)
        if (!field || field.type !== 'file') continue
        
        // Check if value contains File objects
        const files = Array.isArray(value) ? value : (value ? [value] : [])
        const hasFileObjects = files.some(f => f instanceof File)
        
        if (hasFileObjects && uploadFolderUrl) {
          console.log('Uploading files for field:', key)
          const uploadedFiles: any[] = []
          
          for (const file of files) {
            if (!(file instanceof File)) {
              uploadedFiles.push(file) // Already uploaded
              continue
            }
            
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
              throw new Error(errorData.error || 'File upload failed')
            }
            
            const result = await response.json()
            uploadedFiles.push(result.data)
          }
          
          // Update the value with uploaded file data
          processedValues[key] = field.allowMultiple ? uploadedFiles : uploadedFiles[0]
        } else if (hasFileObjects && !uploadFolderUrl) {
          // No upload folder configured, can't upload files
          setStatus('error')
          setMessage('File upload is not configured for this form. Please contact the form administrator.')
          return
        }
      }
      
      const res = await submitForm({ refKey, values: processedValues })
      if (res.ok) {
        // Clear form values
        const init: Record<string, any> = {}
        form.fields.forEach((f) => (init[f.key] = f.type === 'checkbox' ? false : ''))
        setValues(init)
        setStatus('idle')
        setShowSuccessModal(true)
      } else {
        setStatus('error')
        setMessage(res.error.message)
      }
    } catch (error: any) {
      setStatus('error')
      setMessage(error.message || 'An error occurred while submitting the form')
    }
  }

  if (!form) {
    if (status === 'loading') {
      return (
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-center space-x-3 rounded-lg border bg-white p-8 shadow-sm">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></div>
            <span className="text-gray-600">Loading form...</span>
          </div>
        </div>
      )
    }
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {message || 'Form not found or failed to load.'}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-lg">
        <h1 className="text-3xl font-semibold">{form.title}</h1>
        {form.description && <p className="mt-1 whitespace-pre-wrap text-gray-600">{form.description}</p>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-lg border bg-white p-6 shadow-sm">
          {(!Array.isArray(form.fields) || form.fields.length === 0) && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
              This form has no fields configured yet. Add fields in the builder and refresh this page.
            </div>
          )}
          {(Array.isArray(form.fields) ? form.fields : []).map((f) => (
            <FieldControl key={f.key} field={f} value={values[f.key]} onChange={(v) => handleChange(f, v)} form={form} />
          ))}
          <button 
            className="btn relative min-h-[40px] w-auto inline-flex transition-all duration-200 disabled:opacity-70 overflow-hidden" 
            type="submit" 
            disabled={status === 'loading'}
          >
            <span className={status === 'loading' ? 'invisible' : ''}>Submit</span>
            {status === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span className="whitespace-nowrap">Submitting...</span>
                </div>
              </div>
            )}
          </button>
          {status === 'error' && message && (
            <p className="text-sm text-red-600">{message}</p>
          )}
        </form>
      </div>
      
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Thanks! Your response has been recorded."
      />
    </>
  )
}

function FieldControl({ field, value, onChange, form }: { field: FormField; value: any; onChange: (v: any) => void; form: FormConfig }) {
  const id = `f_${field.key}`
  return (
    <div className="space-y-1">
      <label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>
      {field.helpText && <div className="text-xs text-gray-500 whitespace-pre-wrap">{field.helpText}</div>}
      {field.type === 'text' && (
        <input id={id} type="text" required={field.required} placeholder={field.placeholder} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === 'textarea' && (
        <textarea id={id} rows={4} required={field.required} placeholder={field.placeholder} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === 'email' && (
        <input id={id} type="email" required={field.required} placeholder={field.placeholder} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === 'number' && (
        <input id={id} type="number" required={field.required} min={field.min} max={field.max} placeholder={field.placeholder} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')} />
      )}
      {field.type === 'date' && (
        <input id={id} type="date" required={field.required} placeholder={field.placeholder} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === 'file' && form && (
        <FileUploadControl field={field} value={value} onChange={onChange} />
      )}
      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && field.options && (
        <OptionsControl field={field} value={value} onChange={onChange} />
      )}
    </div>
  )
}

function OptionsControl({ field, value, onChange }: { field: FormField; value: any; onChange: (v: any) => void }) {
  if (field.type === 'select') {
    const opts = (field.options ?? []).map((o) => ({ value: o, label: o }))
    return (
      <Select
        options={opts}
        value={value ?? ''}
        onChange={(v) => onChange(v)}
        placeholder="Select an option"
      />
    )
  }
  if (field.type === 'radio') {
    return (
      <div role="radiogroup" aria-label={field.label} className="space-y-2 mt-2">
        {(field.options ?? []).map((opt) => (
          <label key={opt} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
            <input 
              type="radio" 
              name={field.key} 
              value={opt} 
              checked={value === opt} 
              onChange={() => onChange(opt)} 
              required={field.required}
              className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
            />
            <span className="text-sm text-gray-700 leading-relaxed">{opt}</span>
          </label>
        ))}
      </div>
    )
  }
  // checkbox: multi-select as boolean or string[]; we'll treat single checkbox list => string
  if (field.type === 'checkbox') {
    const selected = Array.isArray(value) ? (value as string[]) : []
    function toggle(opt: string) {
      if (selected.includes(opt)) onChange(selected.filter((x) => x !== opt))
      else onChange([...selected, opt])
    }
    return (
      <div className="space-y-2 mt-2">
        {(field.options ?? []).map((opt) => (
          <label key={opt} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
            <input 
              type="checkbox" 
              checked={selected.includes(opt)} 
              onChange={() => toggle(opt)}
              className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
            />
            <span className="text-sm text-gray-700 leading-relaxed">{opt}</span>
          </label>
        ))}
      </div>
    )
  }
  return null
}

function FileUploadControl({ field, value, onChange }: { field: FormField; value: any; onChange: (v: any) => void }) {
  const [uploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Sync selectedFiles with value changes (including reset)
  useEffect(() => {
    if (value) {
      const filesArray = Array.isArray(value) ? value : [value]
      const fileObjects = filesArray.filter(f => f instanceof File)
      if (fileObjects.length > 0) {
        setSelectedFiles(fileObjects)
      }
    } else {
      // Clear selected files when value is cleared (form reset)
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [value])
  
  // @ts-ignore - Used for future feature
  const files = Array.isArray(value) ? value : (value ? [value] : [])
  const maxFiles = field.allowMultiple ? 5 : 1
  
  // Helper function to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
  
  // Helper function to get file preview
  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file)
    }
    return null
  }
  
  // Handle click for better cross-browser compatibility
  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!uploading && (field.allowMultiple || selectedFiles.length < 1)) {
      // Reset value to allow selecting same file again (Chrome fix)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Use a small timeout for better browser compatibility
      setTimeout(() => {
        fileInputRef.current?.click()
      }, 0)
    }
  }
  
  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFilesInput = Array.from(event.target.files || [])
    if (selectedFilesInput.length === 0) return
    
    // For now, allow file selection without upload folder configuration
    // This makes the form usable for testing and local storage
    // @ts-ignore - Future feature
    const needsUpload = false // Will be true when backend upload is implemented
    
    // Validate file count
    if (!field.allowMultiple && selectedFilesInput.length > 1) {
      setError('Only one file is allowed')
      return
    }
    
    const totalFiles = selectedFiles.length + selectedFilesInput.length
    if (totalFiles > maxFiles) {
      setError(`Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed`)
      return
    }
    
    // Validate file types
    const acceptedTypes = field.acceptedTypes || [
      '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',  // Documents
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', // Images
      '.zip', '.rar', '.7z', '.tar', '.gz',  // Archives
      '.mp4', '.mov', '.avi', '.mkv', '.webm',  // Videos
      '.mp3', '.wav', '.m4a', '.ogg', '.flac',  // Audio
      '.csv', '.xls', '.xlsx', '.xml', '.json', '.md'  // Data files
    ]
    for (const file of selectedFilesInput) {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!acceptedTypes.some(type => type.toLowerCase() === extension)) {
        setError(`File type ${extension} is not allowed`)
        return
      }
    }
    
    // Validate file sizes
    const maxSize = field.maxFileSize || (10 * 1024 * 1024) // 10MB default
    for (const file of selectedFilesInput) {
      if (file.size > maxSize) {
        const sizeMB = Math.round(maxSize / (1024 * 1024))
        setError(`File "${file.name}" exceeds maximum size of ${sizeMB}MB`)
        return
      }
    }
    
    setError(null)
    
    // Store selected files for preview (don't upload yet)
    const newFiles = [...selectedFilesInput]
    
    // Update the form value with File objects (will be uploaded on form submit)
    if (field.allowMultiple) {
      const updatedFiles = [...selectedFiles, ...newFiles]
      setSelectedFiles(updatedFiles)
      onChange(updatedFiles)
    } else {
      setSelectedFiles(newFiles)
      onChange(newFiles[0])
    }
    
    // Clear the input for next selection
    event.target.value = ''
  }
  
  function removeFile(index: number) {
    if (field.allowMultiple) {
      const newFiles = selectedFiles.filter((_: any, i: number) => i !== index)
      setSelectedFiles(newFiles)
      onChange(newFiles.length > 0 ? newFiles : [])
    } else {
      setSelectedFiles([])
      onChange(null)
    }
  }
  
  const acceptedTypesStr = field.acceptedTypes?.join(',') || '.pdf,.doc,.docx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.zip,.rar,.7z,.tar,.gz,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.m4a,.ogg,.flac,.csv,.xls,.xlsx,.xml,.json,.md'
  
  return (
    <div className="space-y-2">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypesStr}
        multiple={field.allowMultiple}
        onChange={handleFileSelect}
        className="hidden"
        style={{ display: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
        disabled={uploading || (!field.allowMultiple && selectedFiles.length >= 1)}
      />
      
      {/* Custom File Upload Button */}
      <div 
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick(e as any)
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Choose file"
        className={`
          w-full rounded-md border px-3 py-2 text-sm cursor-pointer transition-all
          ${uploading || (!field.allowMultiple && selectedFiles.length >= 1) 
            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <div className="flex items-center justify-between">
          <span className={selectedFiles.length > 0 ? 'text-gray-700' : 'text-gray-500'}>
            {selectedFiles.length > 0 
              ? (field.allowMultiple ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected` : selectedFiles[0].name)
              : (field.placeholder || 'Choose file...')
            }
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`
                px-3 py-1 rounded text-xs font-medium transition-colors
                ${uploading || (!field.allowMultiple && selectedFiles.length >= 1)
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-gray-100 text-gray-700'
                }
              `}
            >
              Browse
            </span>
          </div>
        </div>
      </div>
      
      {/* File Info */}
      {(field.acceptedTypes && field.acceptedTypes.length > 0) || field.maxFileSize ? (
        <div className="text-xs text-gray-500 space-y-0.5">
          {field.acceptedTypes && field.acceptedTypes.length > 0 && (
            <p>Accepted: {field.acceptedTypes.map(t => t.replace('.', '')).join(', ')}</p>
          )}
          {field.maxFileSize && (
            <p>Max size: {Math.round(field.maxFileSize / (1024 * 1024))}MB per file</p>
          )}
          {field.allowMultiple && (
            <p>Multiple files allowed (max {maxFiles})</p>
          )}
        </div>
      ) : null}
      
      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      
      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file: File, index: number) => {
            const preview = getFilePreview(file)
            const isImage = file.type.startsWith('image/')
            
            return (
              <div key={index} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                {/* File Preview/Icon */}
                <div className="flex-shrink-0">
                  {isImage && preview ? (
                    <Image 
                      src={preview} 
                      alt={file.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover rounded"
                      onLoad={() => {
                        // Clean up blob URL after image loads
                        if (preview.startsWith('blob:')) {
                          setTimeout(() => URL.revokeObjectURL(preview), 100)
                        }
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                        />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                  </p>
                </div>
                
                {/* Remove Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
