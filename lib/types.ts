export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'file';

export type FormField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // for select/radio/checkbox
  min?: number; // for number/date
  max?: number; // for number/date
  pattern?: string; // regex (string)
  // File upload specific options
  acceptedTypes?: string[]; // e.g., ['.pdf', '.jpg', '.png']
  maxFileSize?: number; // in bytes
  allowMultiple?: boolean;
  // Internal migration flags (not persisted)
  _migrationFlag?: 'data' | 'header';
};

export type FormConfig = {
  refKey: string;
  title: string;
  description?: string;
  responseSheetUrl: string; // Google Sheet URL or ID
  slackWebhookUrl?: string;
  uploadFolderUrl?: string; // Google Drive folder URL for file uploads
  fields: FormField[];
  createdAt?: string;
  updatedAt?: string;
};

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

// File upload result type
export type UploadedFile = {
  id: string; // Google Drive file ID
  name: string;
  size: number;
  type: string;
  url: string; // Google Drive public sharing URL
  uploadedAt: string;
};

