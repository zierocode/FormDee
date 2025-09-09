import { z } from 'zod'

export const fieldSchema = z
  .object({
    key: z
      .string()
      .min(1, 'Field key is required')
      .regex(
        /^[a-zA-Z][a-zA-Z0-9_]*$/,
        'Must start with letter, use only letters, numbers, underscores'
      ),
    label: z.string().min(1, 'Field label is required'),
    type: z.enum([
      'text',
      'textarea',
      'email',
      'number',
      'select',
      'radio',
      'checkbox',
      'date',
      'file',
    ]),
    required: z.boolean().default(false),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
    options: z.array(z.string().min(1, 'Option cannot be empty')).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    acceptedTypes: z.array(z.string()).optional(),
    maxFileSize: z.number().optional(),
    allowMultiple: z.boolean().optional(),
  })
  .refine(
    (data) => {
      const needsOptions = ['select', 'radio', 'checkbox'].includes(data.type)
      if (needsOptions && (!data.options || data.options.length === 0)) {
        return false
      }
      return true
    },
    {
      message: 'Options are required for select, radio, and checkbox fields',
      path: ['options'],
    }
  )
  .refine(
    (data) => {
      if (data.min !== undefined && data.max !== undefined && data.min >= data.max) {
        return false
      }
      return true
    },
    {
      message: 'Min value must be less than max value',
      path: ['min'],
    }
  )

export type FieldData = z.infer<typeof fieldSchema>

// Schema specifically for the field editor form with string inputs that get transformed
export const fieldEditorSchema = z
  .object({
    key: z
      .string()
      .min(1, 'Field key is required')
      .regex(
        /^[a-zA-Z][a-zA-Z0-9_]*$/,
        'Must start with letter, use only letters, numbers, underscores'
      ),
    label: z.string().min(1, 'Field label is required'),
    type: z.enum([
      'text',
      'textarea',
      'email',
      'number',
      'select',
      'radio',
      'checkbox',
      'date',
      'file',
    ]),
    required: z.boolean().optional().default(false),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
    options: z
      .string()
      .optional()
      .transform((val) => {
        if (!val?.trim()) return []
        return val
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      }),
    min: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : undefined)),
    max: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : undefined)),
    pattern: z.string().optional(),
    acceptedTypes: z
      .string()
      .optional()
      .transform((val) => {
        if (!val?.trim()) return []
        return val
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => (s.startsWith('.') ? s : `.${s}`))
      }),
    maxFileSize: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return undefined
        return Number(val) * 1024 * 1024 // Convert MB to bytes
      }),
    allowMultiple: z.boolean().optional(),
  })
  .refine(
    (data) => {
      const needsOptions = ['select', 'radio', 'checkbox'].includes(data.type)
      if (needsOptions && (!data.options || data.options.length === 0)) {
        return false
      }
      return true
    },
    {
      message: 'Options are required for select, radio, and checkbox fields',
      path: ['options'],
    }
  )
  .refine(
    (data) => {
      if (data.min !== undefined && data.max !== undefined && data.min >= data.max) {
        return false
      }
      return true
    },
    {
      message: 'Min value must be less than max value',
      path: ['min'],
    }
  )

export type FieldEditorData = z.input<typeof fieldEditorSchema>
