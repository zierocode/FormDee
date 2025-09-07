// API Response Status
export const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  LOADING: 'loading',
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const

// Form Field Types
export const FIELD_TYPES = {
  TEXT: 'text',
  EMAIL: 'email',
  NUMBER: 'number',
  DATE: 'date',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  FILE: 'file',
} as const

// Validation Patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  PHONE: /^\+?[\d\s-()]+$/,
} as const

// Default Values
export const DEFAULTS = {
  DEBOUNCE_DELAY: 500,
  MAX_FIELD_LENGTH: 1000,
  MIN_FIELD_LENGTH: 1,
  MAX_FORM_FIELDS: 50,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
} as const

// File Upload Configuration
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB default
  MAX_FILES_PER_FIELD: 5,
  ALLOWED_TYPES: [
    '.pdf', '.doc', '.docx', '.txt', // Documents
    '.jpg', '.jpeg', '.png', '.gif', '.webp', // Images
    '.zip', '.rar', '.7z', // Archives
    '.mp4', '.mov', '.avi', // Videos (small)
    '.mp3', '.wav', '.m4a', // Audio (small)
  ],
  UPLOAD_TIMEOUT: 60000, // 60 seconds
} as const

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An error occurred. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  VALIDATION_ERROR: 'Please check the form for errors.',
  NOT_FOUND: 'The requested resource was not found.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORM_NOT_FOUND: 'Form not found.',
  SUBMISSION_FAILED: 'Failed to submit form. Please try again.',
  FIELD_REQUIRED: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_URL: 'Please enter a valid URL.',
  REF_KEY_EXISTS: 'Reference key already exists.',
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit.',
  FILE_TYPE_NOT_ALLOWED: 'File type is not allowed.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',
  NO_UPLOAD_FOLDER: 'No upload folder configured for file uploads.',
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  FORM_CREATED: 'Form created successfully.',
  FORM_UPDATED: 'Form updated successfully.',
  FORM_SUBMITTED: 'Form submitted successfully.',
  FORM_DELETED: 'Form deleted successfully.',
} as const

// Routes
export const ROUTES = {
  HOME: '/',
  BUILDER: '/builder',
  BUILDER_EDIT: (refKey: string) => `/builder/${refKey}`,
  FORM: (refKey: string) => `/f/${refKey}`,
  API: {
    FORMS: '/api/forms',
    SUBMIT: '/api/submit',
    SHEETS: '/api/forms/sheets',
    TEST_SLACK: '/api/forms/test-slack',
    UPLOAD: '/api/upload',
  },
} as const

// Local Storage Keys
export const STORAGE_KEYS = {
  ADMIN_KEY: 'adminKey',
  FORM_DRAFT: 'formDraft',
  USER_PREFERENCES: 'userPreferences',
} as const