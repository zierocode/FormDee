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
  pattern?: string // regex (string)
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
  fields: FormField[]
  createdAt?: string
  updatedAt?: string
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
