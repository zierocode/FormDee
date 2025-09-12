export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'file'

export type FormField = {
  key: string
  label: string
  type: FieldType
  required: boolean // Make required field mandatory
  placeholder?: string
  helpText?: string
  options?: string[] // for select/radio/checkbox
  min?: number // for number/date
  max?: number // for number/date
  // Enhanced validation system
  validationRule?: string // User-friendly validation rule type
  pattern?: string // Generated regex pattern (for backward compatibility)
  customPattern?: string // Custom regex when using 'custom_regex' rule
  validationDomain?: string // For email domain restriction
  // File upload specific options
  acceptedTypes?: string[] // e.g., ['.pdf', '.jpg', '.png']
  maxFileSize?: number // in bytes
  allowMultiple?: boolean
  // Internal migration flags (not persisted)
  _migrationFlag?: 'data' | 'header'
}

export type FormConfig = {
  refKey: string
  title: string
  description?: string
  slackWebhookUrl?: string
  slackEnabled?: boolean
  googleSheetUrl?: string
  googleSheetEnabled?: boolean
  fields: FormField[]
  createdAt?: string
  updated_at?: string
  prevRefKey?: string // Used for form updates
}

export type ApiError = {
  code: string
  message: string
  details?: unknown
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }

// File upload result type
export type UploadedFile = {
  key: string // R2 storage key
  name: string
  size: number
  type: string
  url: string // R2 public URL
  uploadedAt: string
}
